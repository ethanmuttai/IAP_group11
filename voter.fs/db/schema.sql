CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  initials TEXT,
  name TEXT NOT NULL,
  party TEXT,
  description TEXT,
  experience TEXT,
  vision TEXT,
  fiscal TEXT,
  agriculture TEXT,
  governance TEXT,
  cost_of_living TEXT
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id TEXT NOT NULL,
  user TEXT NOT NULL DEFAULT 'Anonymous Voter',
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL,
  date TEXT NOT NULL,
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reviews_candidate_id ON reviews (candidate_id);

CREATE VIEW IF NOT EXISTS candidate_ratings AS
SELECT
  c.id,
  c.name,
  ROUND(AVG(r.rating), 1) AS average_rating,
  COUNT(r.id) AS review_count
FROM candidates c
LEFT JOIN reviews r ON r.candidate_id = c.id
GROUP BY c.id, c.name;