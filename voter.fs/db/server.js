const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { fetchWithRetry } = require('./resilientFetch');
const { monitor, statsHandler } = require('./monitoring');
const POLLING_STATIONS = require('./pollingStations');
const { versioning } = require('./v2');
const { landmarksPath, parseLandmarks } = require('./partner');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key']
}));
app.use(express.json());

// 1. MONITORING MUST RUN FIRST (captures all rejected 401s, 429s, and routes)
app.use(monitor);

// 2. Auth Helper & Middleware
const VALID_KEYS = (process.env.API_KEYS || process.env.MY_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);

function requireApiKey(req, res, next) {
  const key = req.get('X-API-Key');

  if (!key || !VALID_KEYS.includes(key)) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Missing or invalid API key');
  }

  req.apiKey = key;
  next();
}

// 3. In-Memory Rate Limiter Middleware
function rateLimit({ windowMs, max }) {
  const hits = new Map();

  return (req, res, next) => {
    const id = req.apiKey || req.ip;
    const now = Date.now();
    let entry = hits.get(id);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(id, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests',
        retryAfter
      });
    }

    next();
  };
}

// REGISTER SECURITY MIDDLEWARES BEFORE ALL ROUTES
app.use(requireApiKey);
app.use(rateLimit({ windowMs: 60000, max: 100 })); // 100 requests per minute per key

// API versioning: /api/v1/... and /api/v2/... (plain app.use, see db/v2.js)
app.use(versioning);

// GET /stats protected route
app.get('/stats', statsHandler);

// Database initialization
const db = new Database(path.join(__dirname, 'voter.db'));

// Table to store user feedback on rallies (atmosphere, safety, and physical accessibility)
db.prepare(`
  CREATE TABLE IF NOT EXISTS rally_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rally_id TEXT NOT NULL,
    user TEXT NOT NULL,
    comment TEXT NOT NULL,
    accessible INTEGER NOT NULL DEFAULT 1, -- 1 for Yes, 0 for No
    congestion_level TEXT NOT NULL,         -- 'Low', 'Medium', 'Extreme'
    date TEXT NOT NULL
  )
`).run();

// Error helper following contract schema: { code, message }
function sendError(res, status, code, message) {
  return res.status(status).json({ code, message });
}

function candidateExists(id) {
  return !!db.prepare('SELECT 1 FROM candidates WHERE id = ?').get(id);
}

// ---------------------------------------------------------------------------
// Candidate & Review Endpoints
// ---------------------------------------------------------------------------

// GET /api/candidates
app.get('/api/candidates', (req, res) => {
  const candidates = db.prepare(`
    SELECT c.*, r.average_rating, r.review_count
    FROM candidates c
    LEFT JOIN candidate_ratings r ON r.id = c.id
  `).all();
  res.json(candidates);
});

// GET /api/candidates/:candidateId
app.get('/api/candidates/:candidateId', (req, res) => {
  const candidate = db.prepare(`
    SELECT c.*, r.average_rating, r.review_count
    FROM candidates c
    LEFT JOIN candidate_ratings r ON r.id = c.id
    WHERE c.id = ?
  `).get(req.params.candidateId);

  if (!candidate) {
    return sendError(res, 404, 'NOT_FOUND', 'Candidate not found');
  }
  res.json(candidate);
});

// GET /api/candidates/:candidateId/reviews?minRating=N
app.get('/api/candidates/:candidateId/reviews', (req, res) => {
  const id = req.params.candidateId;

  let minRating = 1;
  if (req.query.minRating !== undefined) {
    const raw = String(req.query.minRating);
    if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 5) {
      return sendError(res, 400, 'INVALID_PARAMETER', 'minRating must be an integer between 1 and 5');
    }
    minRating = Number(raw);
  }

  if (!candidateExists(id)) {
    return sendError(res, 404, 'NOT_FOUND', 'Candidate not found');
  }

  const reviews = db.prepare(`
    SELECT * FROM reviews
    WHERE candidate_id = ? AND rating >= ?
    ORDER BY date DESC, id DESC
  `).all(id, minRating);

  res.json(reviews);
});

// POST /api/candidates/:candidateId/reviews
app.post('/api/candidates/:candidateId/reviews', (req, res) => {
  const id = req.params.candidateId;

  if (!candidateExists(id)) {
    return sendError(res, 404, 'NOT_FOUND', 'Candidate not found');
  }

  const { user, rating, text } = req.body || {};

  if (rating === undefined || rating === null || text === undefined || text === null) {
    return sendError(res, 400, 'INVALID_REVIEW', 'rating and text are required');
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return sendError(res, 400, 'INVALID_REVIEW', 'rating must be an integer between 1 and 5');
  }
  if (typeof text !== 'string' || text.trim() === '') {
    return sendError(res, 400, 'INVALID_REVIEW', 'text must be a non-empty string');
  }
  if (user !== undefined && user !== null && typeof user !== 'string') {
    return sendError(res, 400, 'INVALID_REVIEW', 'user must be a string');
  }

  const date = new Date().toISOString().split('T')[0];
  const reviewer = (typeof user === 'string' && user.trim()) ? user.trim() : 'Anonymous Voter';

  const result = db.prepare(`
    INSERT INTO reviews (candidate_id, user, rating, text, date)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, reviewer, rating, text.trim(), date);

  const newReview = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newReview);
});

// PUT /api/candidates/:candidateId/reviews/:reviewId
app.put('/api/candidates/:candidateId/reviews/:reviewId', (req, res) => {
  const id = req.params.candidateId;

  if (!candidateExists(id)) {
    return sendError(res, 404, 'NOT_FOUND', 'Candidate not found');
  }

  const rawReviewId = req.params.reviewId;
  const existing = /^\d+$/.test(rawReviewId)
    ? db.prepare('SELECT * FROM reviews WHERE id = ? AND candidate_id = ?').get(Number(rawReviewId), id)
    : undefined;

  if (!existing) {
    return sendError(res, 404, 'NOT_FOUND', 'Review not found');
  }

  const { user, rating, text } = req.body || {};

  if (rating === undefined || rating === null || text === undefined || text === null) {
    return sendError(res, 400, 'INVALID_REVIEW', 'rating and text are required');
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return sendError(res, 400, 'INVALID_REVIEW', 'rating must be an integer between 1 and 5');
  }
  if (typeof text !== 'string' || text.trim() === '') {
    return sendError(res, 400, 'INVALID_REVIEW', 'text must be a non-empty string');
  }
  if (user !== undefined && user !== null && typeof user !== 'string') {
    return sendError(res, 400, 'INVALID_REVIEW', 'user must be a string');
  }

  const reviewer = (typeof user === 'string' && user.trim()) ? user.trim() : 'Anonymous Voter';

  db.prepare(`
    UPDATE reviews SET user = ?, rating = ?, text = ? WHERE id = ?
  `).run(reviewer, rating, text.trim(), existing.id);

  const updated = db.prepare('SELECT * FROM reviews WHERE id = ?').get(existing.id);
  res.json(updated);
});

// ---------------------------------------------------------------------------
// Transport & Landmarks (Group 10 Upstream)
// ---------------------------------------------------------------------------

let lastGoodLandmarks = null; // { data, asof }

// GET /api/transport/landmarks
app.get('/api/transport/landmarks', async (req, res) => {
  try {
    const partnerUrl = `${process.env.PARTNER_URL}${landmarksPath()}`;
    const response = await fetchWithRetry(
      partnerUrl,
      {
        headers: {
          'X-API-Key': process.env.PARTNER_API_KEY,
          'Content-Type': 'application/json'
        }
      },
      { timeoutMs: 1500, retries: 2, delayMs: 200 }
    );

    if (!response.ok) {
      throw new Error(`Partner returned ${response.status}`);
    }

    const landmarks = parseLandmarks(await response.json());

    lastGoodLandmarks = {
      data: landmarks,
      asof: new Date().toISOString()
    };

    return res.json({
      data: landmarks,
      stale: false,
      asof: lastGoodLandmarks.asof
    });
  } catch (err) {
    const reason = err.name === 'TimeoutError' ? 'timeout' : (err.cause?.code || err.message);
    console.error(`Landmarks partner call failed: ${reason}`);

    if (lastGoodLandmarks) {
      return res.json({
        data: lastGoodLandmarks.data,
        stale: true,
        asof: lastGoodLandmarks.asof
      });
    }

    return res.status(502).json({ message: 'Landmark data unavailable' });
  }
});

// GET /api/transport/rides
app.get('/api/transport/rides', async (req, res) => {
  try {
    const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng } = req.query;

    const lat1 = pickup_lat || -1.2864;
    const lng1 = pickup_lng || 36.8172;
    const lat2 = dropoff_lat || -1.3197;
    const lng2 = dropoff_lng || 36.8271;

    const partnerUrl = `${process.env.PARTNER_URL}/rides?pickup_lat=${lat1}&pickup_lng=${lng1}&dropoff_lat=${lat2}&dropoff_lng=${lng2}`;

    const response = await fetchWithRetry(
      partnerUrl,
      {
        headers: {
          'X-API-Key': process.env.PARTNER_API_KEY,
          'Content-Type': 'application/json'
        }
      },
      { timeoutMs: 1500, retries: 2, delayMs: 200 }
    );

    if (!response.ok) {
      console.error('Group 10 API returned status:', response.status);
      return res.status(502).json({ message: 'Partner data unavailable' });
    }

    const data = await response.json();
    const passengerRides = (Array.isArray(data) ? data : []).filter(ride => ride.capacity > 0);
    res.json(passengerRides);
  } catch (err) {
    const reason = err.name === 'TimeoutError' ? 'timeout' : (err.cause?.code || err.message);
    console.error('Partner call failed:', reason);
    res.status(502).json({ message: 'Partner data unavailable' });
  }
});

// ---------------------------------------------------------------------------
// Civic Rally Feed & Templates
// ---------------------------------------------------------------------------

const RALLY_TEMPLATES = [
  {
    id: "rally_01",
    title: "Universal Healthcare Delivery & Medical Workers Forum",
    organizer: "United Democratic Alliance (UDA) Presidential Secretariat",
    candidate: "H.E. Dr. William Ruto",
    party: "United Democratic Alliance (UDA)",
    venue: "Kenyatta National Hospital (KMTC Grounds)",
    location: { lat: -1.3005, lng: 36.8073 },
    dayOffset: 0,
    startTime: "14:00",
    endTime: "17:00",
    expectedCrowd: "6,000+",
    eventType: "Presidential Townhall & Policy Address"
  },
  {
    id: "rally_02",
    title: "Civil Service & Public Sector Management Keynote",
    organizer: "Jubilee / United Progressive Alliance Presidential Campaign",
    candidate: "Dr. Fred Matiang'i",
    party: "United Progressive Alliance / Jubilee Coalition",
    venue: "The Nairobi Hospital (Argwings Kodhek Grounds)",
    location: { lat: -1.2965, lng: 36.8041 },
    dayOffset: 1,
    startTime: "10:00",
    endTime: "12:30",
    expectedCrowd: "1,500",
    eventType: "Civic Dialogue & Policy Address"
  },
  {
    id: "rally_03",
    title: "Rule of Law, Constitutional Integrity & Higher Education Charter",
    organizer: "National Integrity Secretariat & Civic Alliance",
    candidate: "Justice (Rtd) David Maraga",
    party: "Constitutional Integrity Alliance",
    venue: "Aga Khan University Hospital (Parklands)",
    location: { lat: -1.2618, lng: 36.8229 },
    dayOffset: 1,
    startTime: "15:00",
    endTime: "18:00",
    expectedCrowd: "2,000",
    eventType: "Academic Townhall & Public Lecture"
  },
  {
    id: "rally_04",
    title: "Devolution Strengthening & Senior Citizens Welfare Address",
    organizer: "Wiper Democratic Movement National Secretariat",
    candidate: "H.E. Kalonzo Musyoka",
    party: "Wiper Democratic Movement / Ukombozi Alliance",
    venue: "The Karen Hospital (Karen Road)",
    location: { lat: -1.3328, lng: 36.7198 },
    dayOffset: 2,
    startTime: "11:00",
    endTime: "13:30",
    expectedCrowd: "1,000",
    eventType: "Community Engagement & Party Delegates Meeting"
  },
  {
    id: "rally_05",
    title: "Child Welfare, Public Health Accountability & Human Rights Dialogue",
    organizer: "Defenders of the Constitution Secretariat",
    candidate: "Sen. Okiya Omtatah Okoiti",
    party: "Social Justice Coalition",
    venue: "Gertrude's Children's Hospital (Muthaiga)",
    location: { lat: -1.2581, lng: 36.8361 },
    dayOffset: 2,
    startTime: "09:30",
    endTime: "12:00",
    expectedCrowd: "800",
    eventType: "Public Interest Roundtable"
  },
  {
    id: "rally_06",
    title: "Private Sector Growth, Sports Infrastructure & Youth Enterprise Summit",
    organizer: "People's Dialogue Forum & Business Coalition",
    candidate: "United Opposition Consultative Secretariat",
    party: "United Opposition Platform",
    venue: "Parklands Sports Club (Ojijo Road)",
    location: { lat: -1.2673, lng: 36.8142 },
    dayOffset: 3,
    startTime: "16:00",
    endTime: "19:00",
    expectedCrowd: "2,500",
    eventType: "Economic Keynote & Business Assembly"
  },
  {
    id: "rally_07",
    title: "National Presidential Final Pitch & Mega Civic Mobilization",
    organizer: "Consortium of Registered Political Parties & Civic Engagement Forum",
    candidate: "Presidential Candidates Joint Civic Appearance",
    party: "Multi-Party Civic Initiative",
    venue: "Nyayo National Stadium",
    location: { lat: -1.3039, lng: 36.8242 },
    dayOffset: 4,
    startTime: "10:30",
    endTime: "17:30",
    expectedCrowd: "40,000+",
    eventType: "National Mega Campaign Rally"
  },
  {
    id: "rally_08",
    title: "Diplomatic Community & Sustainable Trade Forum",
    organizer: "Green Economy Coalition",
    candidate: "Civic Trade Policy Taskforce",
    party: "Independent Civic Bloc",
    venue: "Village Market (Limuru Road)",
    location: { lat: -1.2294, lng: 36.8042 },
    dayOffset: 3,
    startTime: "14:00",
    endTime: "16:30",
    expectedCrowd: "1,200",
    eventType: "Trade & Environment Townhall"
  },
  {
    id: "rally_09",
    title: "Urban Commerce, Taxation & Retail SMEs Dialogue",
    organizer: "Nairobi Business Community Forum",
    candidate: "Alliance for Economic Relief",
    party: "United Progressive Alliance",
    venue: "Sarit Centre (Westlands)",
    location: { lat: -1.2635, lng: 36.8028 },
    dayOffset: 2,
    startTime: "10:00",
    endTime: "13:00",
    expectedCrowd: "3,500",
    eventType: "SME Economic Summit"
  },
  {
    id: "rally_10",
    title: "Private Healthcare Financing & Medical Insurance Reform",
    organizer: "Healthcare Access Initiative",
    candidate: "Dr. Fred Matiang'i",
    party: "Jubilee Coalition",
    venue: "MP Shah Hospital (Shivachi Road, Parklands)",
    location: { lat: -1.2642, lng: 36.8155 },
    dayOffset: 1,
    startTime: "11:00",
    endTime: "13:30",
    expectedCrowd: "900",
    eventType: "Healthcare Stakeholders Forum"
  },
  {
    id: "rally_11",
    title: "Financial Inclusion, Micro-Credit & Fintech Policy Address",
    organizer: "Financial Inclusion Secretariat",
    candidate: "H.E. Dr. William Ruto",
    party: "United Democratic Alliance (UDA)",
    venue: "Equity Centre (Upper Hill, Hospital Road)",
    location: { lat: -1.2989, lng: 36.8164 },
    dayOffset: 4,
    startTime: "14:30",
    endTime: "17:00",
    expectedCrowd: "2,200",
    eventType: "Fintech & Financial Access Keynote"
  },
  {
    id: "rally_12",
    title: "Metropolitan Governance, Water Distribution & Waste Management Summit",
    organizer: "Nairobi County Leadership Forum",
    candidate: "Metropolitan Civic Coalition",
    party: "Multi-Party Civic Initiative",
    venue: "Nairobi City Hall (City Hall Way)",
    location: { lat: -1.2884, lng: 36.8227 },
    dayOffset: 0,
    startTime: "09:00",
    endTime: "12:00",
    expectedCrowd: "4,000",
    eventType: "Urban Governance & Accountability Townhall"
  },
  {
    id: "rally_13",
    title: "Media Freedom, Ethical Communications & Digital Rights Dialogue",
    organizer: "Youth Civic League & Media Guild",
    candidate: "Sen. Okiya Omtatah Okoiti",
    party: "Social Justice Coalition",
    venue: "Daystar University (Valley Road Campus)",
    location: { lat: -1.2982, lng: 36.8062 },
    dayOffset: 3,
    startTime: "13:30",
    endTime: "16:00",
    expectedCrowd: "1,800",
    eventType: "Campus Civic Townhall"
  },
  {
    id: "rally_14",
    title: "Higher Education Funding Model & International Relations Colloquium",
    organizer: "Inter-University Student Council Secretariat",
    candidate: "Justice (Rtd) David Maraga",
    party: "Constitutional Integrity Alliance",
    venue: "United States International University - Africa (USIU, Roysambu)",
    location: { lat: -1.2186, lng: 36.8797 },
    dayOffset: 5,
    startTime: "10:30",
    endTime: "14:00",
    expectedCrowd: "4,500",
    eventType: "Youth & Education Policy Address"
  }
];

const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;

function nairobiNow() {
  const iso = new Date(Date.now() + NAIROBI_OFFSET_MS).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function getRallies() {
  const today = nairobiNow().date;
  return RALLY_TEMPLATES.map(({ dayOffset, ...rally }) => ({
    ...rally,
    date: addDays(today, dayOffset)
  }));
}

// GET /api/rallies
app.get('/api/rallies', (req, res) => {
  const { upcoming } = req.query;

  if (upcoming !== undefined && upcoming !== 'true' && upcoming !== 'false') {
    return sendError(res, 400, 'INVALID_PARAMETER', 'upcoming must be true or false');
  }

  let rallies = getRallies();

  if (upcoming === 'true') {
    const now = nairobiNow();
    rallies = rallies.filter(r => r.date > now.date || (r.date === now.date && r.endTime > now.time));
  }

  res.json(rallies);
});

// ---------------------------------------------------------------------------
// Rally Attendee Feedback & Accessibility Reports
// ---------------------------------------------------------------------------

// GET /api/rallies/:rallyId/comments
app.get('/api/rallies/:rallyId/comments', (req, res) => {
  const { rallyId } = req.params;
  const comments = db.prepare(`
    SELECT * FROM rally_comments
    WHERE rally_id = ?
    ORDER BY id DESC
  `).all(rallyId);

  res.json(comments);
});

// POST /api/rallies/:rallyId/comments
app.post('/api/rallies/:rallyId/comments', (req, res) => {
  const { rallyId } = req.params;
  const { user, comment, accessible, congestion_level } = req.body || {};

  if (!comment || typeof comment !== 'string' || comment.trim() === '') {
    return sendError(res, 400, 'INVALID_INPUT', 'comment is required');
  }

  const reviewer = (typeof user === 'string' && user.trim()) ? user.trim() : 'Anonymous Attendee';
  const isAccessible = (accessible === false || accessible === 0) ? 0 : 1;
  const congestion = ['Low', 'Medium', 'Extreme'].includes(congestion_level) ? congestion_level : 'Medium';
  const date = new Date().toISOString().split('T')[0];

  const result = db.prepare(`
    INSERT INTO rally_comments (rally_id, user, comment, accessible, congestion_level, date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(rallyId, reviewer, comment.trim(), isAccessible, congestion, date);

  const saved = db.prepare('SELECT * FROM rally_comments WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(saved);
});

// ---------------------------------------------------------------------------
// Rally Travel Advice
// ---------------------------------------------------------------------------

const PARTNER_RETRY = { timeoutMs: 1500, retries: 2, delayMs: 200 };
const PRESSURE_LEVELS = ['low', 'medium', 'high'];
const PRESSURE_BUFFER_MINUTES = [15, 30, 60];
const WALKING_KM_PER_HOUR = 5;
const ALT_DROPOFF_MIN_KM = 0.4;
const ALT_DROPOFF_MAX_KM = 2;
const ALT_MIN_FARE_SAVING_PERCENT = 15;
const ALT_MIN_MINUTES_SAVING = 3;

async function fetchPartnerJson(path) {
  const response = await fetchWithRetry(
    `${process.env.PARTNER_URL}${path}`,
    {
      headers: {
        'X-API-Key': process.env.PARTNER_API_KEY,
        'Content-Type': 'application/json'
      }
    },
    PARTNER_RETRY
  );
  if (!response.ok) throw new Error(`Partner returned ${response.status}`);
  return response.json();
}

async function loadLandmarks() {
  try {
    const list = parseLandmarks(await fetchPartnerJson(landmarksPath()));
    lastGoodLandmarks = { data: list, asof: new Date().toISOString() };
    return list;
  } catch (err) {
    if (lastGoodLandmarks && Array.isArray(lastGoodLandmarks.data)) return lastGoodLandmarks.data;
    throw err;
  }
}

async function loadPassengerRides(from, to) {
  const query = new URLSearchParams({
    pickup_lat: from.lat,
    pickup_lng: from.lng,
    dropoff_lat: to.lat,
    dropoff_lng: to.lng
  });
  const data = await fetchPartnerJson(`/rides?${query}`);
  return (Array.isArray(data) ? data : []).filter(ride => ride.capacity > 0);
}

function coords(landmark) {
  const lat = Number(landmark && landmark.location && landmark.location.lat);
  const lng = Number(landmark && landmark.location && landmark.location.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function distanceKm(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function summariseRides(rides) {
  const usable = rides.filter(r =>
    Number.isFinite(r.etaMinutes) && r.fare && Number.isFinite(r.fare.amount));
  if (usable.length === 0) return { count: rides.length, fastest: null, cheapest: null };
  return {
    count: rides.length,
    fastest: usable.reduce((a, b) => (b.etaMinutes < a.etaMinutes ? b : a)),
    cheapest: usable.reduce((a, b) => (b.fare.amount < a.fare.amount ? b : a))
  };
}

function crowdNumber(text) {
  const n = parseInt(String(text).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function assessPressure(rally, summary) {
  const crowd = crowdNumber(rally.expectedCrowd);
  let level = crowd >= 5000 ? 2 : crowd >= 1500 ? 1 : 0;
  const reasons = [`Expected attendance is ${rally.expectedCrowd}`];

  const tight = [];
  if (summary.count === 0) {
    tight.push('No ride options were returned for this route');
  } else {
    if (summary.count < 3) {
      tight.push(`Only ${summary.count} ride option${summary.count === 1 ? ' is' : 's are'} available`);
    }
    if (summary.fastest && summary.fastest.etaMinutes > 10) {
      tight.push(`The fastest ride is ${summary.fastest.etaMinutes} minutes away`);
    }
  }
  if (tight.length > 0) {
    level = Math.min(level + 1, 2);
    reasons.push(...tight);
  }

  return {
    level: PRESSURE_LEVELS[level],
    expectedCrowdNumber: crowd,
    bufferMinutes: PRESSURE_BUFFER_MINUTES[level],
    reasons
  };
}

async function findAlternativeDropoff(landmarks, pickup, pickupPoint, rally, mainSummary) {
  let best = null;
  for (const landmark of landmarks) {
    const point = coords(landmark);
    if (!point || String(landmark.id) === String(pickup.id)) continue;
    const km = distanceKm(point, rally.location);
    if (km < ALT_DROPOFF_MIN_KM || km > ALT_DROPOFF_MAX_KM) continue;
    if (!best || km < best.km) best = { landmark, point, km };
  }
  if (!best) return null;

  let altSummary;
  try {
    altSummary = summariseRides(await loadPassengerRides(pickupPoint, best.point));
  } catch (err) {
    return null;
  }

  const savesFare = mainSummary.cheapest && altSummary.cheapest
    ? Math.max(0, mainSummary.cheapest.fare.amount - altSummary.cheapest.fare.amount) : 0;
  const savesMinutes = mainSummary.fastest && altSummary.fastest
    ? Math.max(0, mainSummary.fastest.etaMinutes - altSummary.fastest.etaMinutes) : 0;
  const farePercent = mainSummary.cheapest && mainSummary.cheapest.fare.amount > 0
    ? (savesFare / mainSummary.cheapest.fare.amount) * 100 : 0;
  if (farePercent < ALT_MIN_FARE_SAVING_PERCENT && savesMinutes < ALT_MIN_MINUTES_SAVING) return null;

  return {
    landmark: { id: String(best.landmark.id), name: best.landmark.name },
    distanceKm: Math.round(best.km * 10) / 10,
    walkMinutes: Math.round((best.km / WALKING_KM_PER_HOUR) * 60),
    fastest: altSummary.fastest,
    cheapest: altSummary.cheapest,
    savesFare,
    savesMinutes
  };
}

// GET /api/rallies/:rallyId/travel?from=<landmarkId>
app.get('/api/rallies/:rallyId/travel', async (req, res) => {
  const rally = getRallies().find(r => r.id === req.params.rallyId);
  if (!rally) return sendError(res, 404, 'NOT_FOUND', 'Rally not found');

  const fromId = typeof req.query.from === 'string' ? req.query.from.trim() : '';
  if (!fromId) return sendError(res, 400, 'INVALID_PARAMETER', 'from (a landmark id) is required');

  const startMs = Date.parse(`${rally.date}T${rally.startTime}:00+03:00`);
  const endMs = Date.parse(`${rally.date}T${rally.endTime}:00+03:00`);
  if (endMs <= Date.now()) return sendError(res, 409, 'EVENT_ENDED', 'This event has already ended');

  try {
    const landmarks = await loadLandmarks();
    const pickup = landmarks.find(l => String(l.id) === fromId);
    const pickupPoint = pickup && coords(pickup);
    if (!pickupPoint) return sendError(res, 404, 'NOT_FOUND', 'Landmark not found');

    const summary = summariseRides(await loadPassengerRides(pickupPoint, rally.location));
    const pressure = assessPressure(rally, summary);

    const etaMinutes = summary.fastest ? summary.fastest.etaMinutes : 0;
    const leaveMs = startMs - (etaMinutes + pressure.bufferMinutes) * 60000;
    const leaveIso = new Date(leaveMs + NAIROBI_OFFSET_MS).toISOString();

    const alternativeDropoff = pressure.level === 'low'
      ? null
      : await findAlternativeDropoff(landmarks, pickup, pickupPoint, rally, summary);

    res.json({
      rally: {
        id: rally.id,
        title: rally.title,
        venue: rally.venue,
        date: rally.date,
        startTime: rally.startTime,
        endTime: rally.endTime,
        expectedCrowd: rally.expectedCrowd
      },
      from: { id: String(pickup.id), name: pickup.name },
      rides: { count: summary.count, fastest: summary.fastest, cheapest: summary.cheapest },
      pressure,
      leaveBy: {
        date: leaveIso.slice(0, 10),
        time: leaveIso.slice(11, 16),
        basedOnEtaMinutes: etaMinutes,
        bufferMinutes: pressure.bufferMinutes,
        leaveNow: leaveMs <= Date.now()
      },
      alternativeDropoff,
      disclaimer: 'Estimates only. Ride fares and ETAs reflect current conditions, not the event time. ' +
        'Crowd pressure is a rule-based estimate from expected attendance and the number of ride options, not live demand.'
    });
  } catch (err) {
    const reason = err.name === 'TimeoutError' ? 'timeout' : (err.cause?.code || err.message);
    console.error('Rally travel advice failed:', reason);
    res.status(502).json({ message: 'Partner data unavailable' });
  }
});

// ---------------------------------------------------------------------------
// Polling Stations & Snapping
// ---------------------------------------------------------------------------

const MAX_STATION_LANDMARK_KM = 15;

// GET /api/polling-stations
app.get('/api/polling-stations', (req, res) => {
  res.json(POLLING_STATIONS);
});

// GET /api/polling-stations/:stationId/nearest-landmark
app.get('/api/polling-stations/:stationId/nearest-landmark', async (req, res) => {
  const station = POLLING_STATIONS.find(s => s.id === req.params.stationId);
  if (!station) {
    return sendError(res, 404, 'NOT_FOUND', 'Polling station not found');
  }

  try {
    const landmarks = await loadLandmarks();

    let nearest = null;
    for (const landmark of landmarks) {
      const point = coords(landmark);
      if (!point) continue;
      const km = distanceKm(station.location, point);
      if (!nearest || km < nearest.km) nearest = { landmark, point, km };
    }

    if (!nearest || nearest.km > MAX_STATION_LANDMARK_KM) {
      return sendError(res, 422, 'NO_NEARBY_LANDMARK',
        `No ride landmark within ${MAX_STATION_LANDMARK_KM} km of this polling station`);
    }

    res.json({
      station: { id: station.id, name: station.name, area: station.area },
      landmark: {
        id: String(nearest.landmark.id),
        name: nearest.landmark.name,
        location: nearest.point
      },
      distanceKm: Math.round(nearest.km * 10) / 10
    });
  } catch (err) {
    const reason = err.name === 'TimeoutError' ? 'timeout' : (err.cause?.code || err.message);
    console.error('Nearest landmark lookup failed:', reason);
    res.status(502).json({ message: 'Partner data unavailable' });
  }
});

// ---------------------------------------------------------------------------
// Error Handling Fallbacks
// ---------------------------------------------------------------------------

// Unknown routes -> contract-shaped 404
app.use((req, res) => {
  sendError(res, 404, 'NOT_FOUND', 'Route not found');
});

// JSON parsing error / safety net -> 400 or 500
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'INVALID_REVIEW', 'Request body is not valid JSON');
  }
  console.error(err);
  sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong');
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;