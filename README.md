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

**PUT /api/candidates/:id/reviews/:reviewId** replaces an existing review. Body is the same as POST: `rating` (integer 1 to 5, required), `text` (non-empty string, required), `user` (string, optional, resets to "Anonymous Voter" if omitted). The review's original `date` is kept.
```
curl -X PUT https://iap-group11.onrender.com/api/candidates/maraga/reviews/4 -H "Content-Type: application/json" -d '{"user":"Wanjiku","rating":3,"text":"Updated view after the debate."}'
```
→ `200`
```json
{"id":4,"candidate_id":"maraga","user":"Wanjiku","rating":3,"text":"Updated view after the debate.","date":"2026-10-19"}
```
A review id that doesn't exist, or belongs to a different candidate, returns `404`.

(Windows PowerShell users: use `curl.exe`, and put the JSON body in a file, then pass `--data-binary "@body.json"`.)

## Errors

Every error returns JSON in the form `{ "code": "...", "message": "..." }`.

| Request | Status | Body |
|---|---|---|
| `GET /api/candidates/nobody` (unknown candidate, also on `/reviews` GET and POST) | 404 | `{ "code": "NOT_FOUND", "message": "Candidate not found" }` |
| `GET .../reviews?minRating=abc` (not an integer from 1 to 5) | 400 | `{ "code": "INVALID_PARAMETER", "message": "minRating must be an integer between 1 and 5" }` |
| `PUT .../reviews/999` (review not found for that candidate) | 404 | `{ "code": "NOT_FOUND", "message": "Review not found" }` |
| POST or PUT missing `rating` or `text` | 400 | `{ "code": "INVALID_REVIEW", "message": "rating and text are required" }` |
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

## Monitoring & Observability (`/stats`)

The backend exposes a runtime health and metrics endpoint protected by API authentication.

- **Endpoint:** `GET /stats`
- **Headers:** `X-API-Key: <your-api-key>`

### Example Response:
```json
{
  "startedAt": "2026-11-06T10:22:46.926Z",
  "uptimeSeconds": 59,
  "total": 60,
  "clientErrors": 29,
  "serverErrors": 0,
  "errorRatePercent": 0,
  "avgMs": 1.3,
  "routes": {
    "GET (no route)": {
      "count": 25,
      "clientErrors": 25,
      "serverErrors": 0,
      "avgMs": 0.9,
      "maxMs": 6.2
    },
    "GET /api/candidates/:candidateId": {
      "count": 13,
      "clientErrors": 4,
      "serverErrors": 0,
      "avgMs": 1.8,
      "maxMs": 3.8
    },
    "GET /api/rallies": {
      "count": 6,
      "clientErrors": 0,
      "serverErrors": 0,
      "avgMs": 1.1,
      "maxMs": 1.5
    },
    "GET /api/candidates": {
      "count": 16,
      "clientErrors": 0,
      "serverErrors": 0,
      "avgMs": 1.6,
      "maxMs": 2.3
    }
  }
}