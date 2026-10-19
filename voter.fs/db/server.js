const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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

  // Validate minRating first (400), then candidate (404)
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
    const response = await fetch(partnerUrl);

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

    const response = await fetch(partnerUrl);

    if (!response.ok) {
      console.error('Group 10 API returned status:', response.status);
      return res.status(502).json({ message: 'Partner data unavailable' });
    }

    const data = await response.json();
    
    // Filter out parcel options with capacity 0
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

// Safety net: malformed JSON -> 400, anything else -> 500, always { code, message }
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'INVALID_REVIEW', 'Request body is not valid JSON');
  }
  console.error(err);
  sendError(res, 500, 'INTERNAL_ERROR', 'Something went wrong');
});

// Only listen when run directly (lets Jest/supertest import the app)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;