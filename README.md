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

**GET /api/candidates/:id/reviews** returns reviews, newest first (`[]` if none).
```
curl https://iap-group11.onrender.com/api/candidates/ruto/reviews
```
→ `200` PASTE REAL OUTPUT HERE

**POST /api/candidates/:id/reviews** creates a review. Body: `rating` (number, required), `text` (string, required), `user` (string, optional).
```
curl -X POST https://iap-group11.onrender.com/api/candidates/maraga/reviews -H "Content-Type: application/json" -d '{"user":"Wanjiku","rating":4,"text":"Clear plan on judicial reform."}'
```
→ `201` PASTE REAL OUTPUT HERE

## Errors

Errors return JSON like `{ "error": "message" }`.

- `GET /api/candidates/nobody` → `404` `{ "error": "Candidate not found" }`
- POST without `rating` or `text` → `400` `{ "error": "rating and text are required" }`

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