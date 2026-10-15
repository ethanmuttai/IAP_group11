const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 5000; // React runs on 3000, so the server needs a different port

// Let the React app (running on a different port) make requests to us
app.use(cors());
// Let the server understand JSON sent in request bodies (e.g. a new review)
app.use(express.json());

// Connect to the same voter.db file created by init-db.js
const db = new Database(path.join(__dirname, 'voter.db'));

// ---------------------------------------------------------------------
// ROUTES
// A "route" is just: "when a request comes in for this URL, do this."
// ---------------------------------------------------------------------

// GET /api/candidates
// Returns every candidate, WITH their real computed rating from reviews
// (using the candidate_ratings view we already built into schema.sql).
app.get('/api/candidates', (req, res) => {
  const candidates = db.prepare(`
    SELECT c.*, r.average_rating, r.review_count
    FROM candidates c
    LEFT JOIN candidate_ratings r ON r.id = c.id
  `).all();

  res.json(candidates);
});

// GET /api/candidates/:id
// Returns one candidate's full details, by id (e.g. "ruto").
app.get('/api/candidates/:id', (req, res) => {
  const candidate = db.prepare(`
    SELECT c.*, r.average_rating, r.review_count
    FROM candidates c
    LEFT JOIN candidate_ratings r ON r.id = c.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!candidate) {
    return res.status(404).json({ error: 'Candidate not found' });
  }
  res.json(candidate);
});

// GET /api/candidates/:id/reviews
// Returns all reviews for one candidate, newest first.
app.get('/api/candidates/:id/reviews', (req, res) => {
  const reviews = db.prepare(`
    SELECT * FROM reviews WHERE candidate_id = ? ORDER BY date DESC, id DESC
  `).all(req.params.id);

  res.json(reviews);
});

// POST /api/candidates/:id/reviews
// Saves a NEW review for one candidate. This is the piece that makes
// reviews actually "stick" instead of disappearing on refresh.
app.post('/api/candidates/:id/reviews', (req, res) => {
  const { user, rating, text } = req.body;
  const candidateId = req.params.id;

  if (!rating || !text) {
    return res.status(400).json({ error: 'rating and text are required' });
  }

  const date = new Date().toISOString().split('T')[0];

  const insert = db.prepare(`
    INSERT INTO reviews (candidate_id, user, rating, text, date)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = insert.run(candidateId, user || 'Anonymous Voter', rating, text, date);

  const newReview = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newReview);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});