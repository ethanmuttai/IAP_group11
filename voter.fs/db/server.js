const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 1. Load keys from process.env.API_KEYS (comma-separated for multiple consumers)
const VALID_KEYS = (process.env.API_KEYS || process.env.MY_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);

// Auth Middleware: Enforce X-API-Key on ALL endpoints
function requireApiKey(req, res, next) {
  const key = req.get('X-API-Key');

  if (!key || !VALID_KEYS.includes(key)) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Missing or invalid API key');
  }

  req.apiKey = key;
  next();
}

// 2. In-Memory Rate Limiter Middleware (Part C)
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

const db = new Database(path.join(__dirname, 'voter.db'));

// Every error follows the contract's Error schema: { code, message }
function sendError(res, status, code, message) {
  return res.status(status).json({ code, message });
}

function candidateExists(id) {
  return !!db.prepare('SELECT 1 FROM candidates WHERE id = ?').get(id);
}

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
      return sendError(res, 400, 'INVALID_PARAMETER',
        'minRating must be an integer between 1 and 5');
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

// GET /api/transport/landmarks -> Partner Integration (Group 10)
app.get('/api/transport/landmarks', async (req, res) => {
  try {
    const partnerUrl = `${process.env.PARTNER_URL}/landmarks`;
    const response = await fetch(partnerUrl, {
      headers: {
        'X-API-Key': process.env.PARTNER_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Group 10 Landmarks API status:', response.status);
      return res.status(502).json({ message: 'Landmark data unavailable' });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Landmarks partner call failed:', err.message);
    res.status(502).json({ message: 'Landmark data unavailable' });
  }
});

// GET /api/transport/rides -> Partner Integration (Group 10)
app.get('/api/transport/rides', async (req, res) => {
  try {
    const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng } = req.query;

    const lat1 = pickup_lat || -1.2864;
    const lng1 = pickup_lng || 36.8172;
    const lat2 = dropoff_lat || -1.3197;
    const lng2 = dropoff_lng || 36.8271;

    const partnerUrl = `${process.env.PARTNER_URL}/rides?pickup_lat=${lat1}&pickup_lng=${lng1}&dropoff_lat=${lat2}&dropoff_lng=${lng2}`;

    const response = await fetch(partnerUrl, {
      headers: {
        'X-API-Key': process.env.PARTNER_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Group 10 API returned status:', response.status);
      return res.status(502).json({ message: 'Partner data unavailable' });
    }

    const data = await response.json();
    const passengerRides = data.filter(ride => ride.capacity > 0);
    res.json(passengerRides);
  } catch (err) {
    console.error('Partner call failed:', err.message);
    res.status(502).json({ message: 'Partner data unavailable' });
  }
});

// Unknown routes -> contract-shaped 404
app.use((req, res) => {
  sendError(res, 404, 'NOT_FOUND', 'Route not found');
});

// Safety net: malformed JSON -> 400, anything else -> 500
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