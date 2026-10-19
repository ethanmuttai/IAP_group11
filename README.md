# Voter Guide API

An API that lists Kenyan presidential candidates with their policy positions and lets voters read and post reviews. Built for front-end developers making a voter info app.

**Base URL:** `https://iap-group11.onrender.com`
(Free hosting: if idle, the first request can take ~50 seconds. Wait and retry.)

**Auth:** none for now. All endpoints are public.

**Candidate ids:** `ruto`, `kalonzo`, `matiangi`, `maraga`

## Quickstart

```
curl https://iap-group11.onrender.com/api/candidates
```

## Endpoints

**GET /api/candidates** returns all candidates.
```
curl https://iap-group11.onrender.com/api/candidates
```
→ `200` `[{ "id": "ruto", "name": "Dr. William Ruto", "party": "Kenya Kwanza Alliance / UDA", "average_rating": 2.3, "review_count": 3, ... }]`
(Each candidate also has `initials`, `description`, `experience`, `vision`, `fiscal`, `agriculture`, `governance`, `cost_of_living`. `average_rating` is `null` if there are no reviews.)

**GET /api/candidates/:id** returns one candidate.
```
curl https://iap-group11.onrender.com/api/candidates/ruto
```
→ `200` a single candidate object (same fields as above)

**GET /api/candidates/:id/reviews** returns reviews, newest first (`[]` if none). Optional query `minRating` (integer 1 to 5) returns only reviews with a rating greater than or equal to it.
```
curl "https://iap-group11.onrender.com/api/candidates/ruto/reviews?minRating=4"
```
→ `200`
```json
[{"id":1,"candidate_id":"ruto","user":"Anonymous Voter","rating":4,"text":"Clear focus on devolution structural systems, but need more clarity on agricultural subsidy time-tables.","date":"2026-06-25"}]
```

**POST /api/candidates/:id/reviews** creates a review. Body: `rating` (integer 1 to 5, required), `text` (non-empty string, required), `user` (string, optional, defaults to "Anonymous Voter").
```
curl -X POST https://iap-group11.onrender.com/api/candidates/maraga/reviews -H "Content-Type: application/json" -d '{"user":"Wanjiku","rating":4,"text":"Clear plan on judicial reform."}'
```
→ `201`
```json
{"id":4,"candidate_id":"maraga","user":"Wanjiku","rating":4,"text":"Clear plan on judicial reform.","date":"2026-10-19"}
```

(Windows PowerShell users: use `curl.exe`, and put the JSON body in a file, then pass `--data-binary "@body.json"`.)

## Errors

Every error returns JSON in the form `{ "code": "...", "message": "..." }`.

| Request | Status | Body |
|---|---|---|
| `GET /api/candidates/nobody` (unknown candidate, also on `/reviews` GET and POST) | 404 | `{ "code": "NOT_FOUND", "message": "Candidate not found" }` |
| `GET .../reviews?minRating=abc` (not an integer from 1 to 5) | 400 | `{ "code": "INVALID_PARAMETER", "message": "minRating must be an integer between 1 and 5" }` |
| POST missing `rating` or `text` | 400 | `{ "code": "INVALID_REVIEW", "message": "rating and text are required" }` |
| POST with `rating` outside 1 to 5 or not an integer | 400 | `{ "code": "INVALID_REVIEW", "message": "rating must be an integer between 1 and 5" }` |

## Run locally

Needs Node.js 18+.
```
git clone https://github.com/ethanmuttai/IAP_group11.git
cd IAP_group11/voter.fs
npm install
node db/init-db.js
node db/server.js
```
Runs at `http://localhost:5000`.