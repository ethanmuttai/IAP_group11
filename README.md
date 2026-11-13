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

**GET /api/rallies** returns the civic event feed provided for Group 12 (accessibility and traffic planning): venue, venue coordinates, date, start and end time (Nairobi time) and expected attendance. Optional query `upcoming=true` returns only events that have not ended yet. The events are sample data: dates are generated relative to today, so the feed always has current and upcoming events. Results are ordered by date.
```
curl "https://iap-group11.onrender.com/api/rallies?upcoming=true"
```
→ `200`
```json
[{"id":"rally_07","title":"National Presidential Final Pitch & Mega Civic Mobilization","organizer":"Consortium of Registered Political Parties & Civic Engagement Forum","candidate":"Presidential Candidates Joint Civic Appearance","party":"Multi-Party Civic Initiative","venue":"Nyayo National Stadium","location":{"lat":-1.3039,"lng":36.8242},"eventType":"National Mega Campaign Rally","startTime":"10:30","endTime":"17:30","expectedCrowd":"40,000+","date":"2026-11-14"}]
```
`expectedCrowd` is text (for example `"1,500"` or `"40,000+"`), not a number.

**GET /api/rallies/:rallyId/travel?from=:landmarkId** is our own feature built on Group 10's data. It combines a rally with Group 10's landmarks and rides and returns: the fastest and cheapest ride from the landmark the voter starts at to the venue, a crowd-pressure level (`low`, `medium` or `high`), a suggested leave-by time, and, when the venue is likely to be busy, a walkable alternative drop-off. `from` is a landmark id from `GET /api/transport/landmarks`.
```
curl "https://iap-group11.onrender.com/api/rallies/rally_07/travel?from=1" -H "X-API-Key: YOUR_KEY"
```
→ `200` (shortened)
```json
{"rally":{"id":"rally_07","venue":"Nyayo National Stadium","date":"2026-11-14","startTime":"10:30","expectedCrowd":"40,000+"},
 "from":{"id":"1","name":"cbd"},
 "rides":{"count":3,"fastest":{"providerName":"Bolt","rideType":"Bolt Boda","fare":{"amount":99,"currency":"KES"},"etaMinutes":5},"cheapest":{"providerName":"Bolt","rideType":"Bolt Boda","fare":{"amount":99,"currency":"KES"},"etaMinutes":5}},
 "pressure":{"level":"high","expectedCrowdNumber":40000,"bufferMinutes":60,"reasons":["Expected attendance is 40,000+"]},
 "leaveBy":{"date":"2026-11-14","time":"09:25","basedOnEtaMinutes":5,"bufferMinutes":60,"leaveNow":false},
 "alternativeDropoff":{"landmark":{"id":"4","name":"uhuru park"},"distanceKm":1,"walkMinutes":11,"savesFare":21,"savesMinutes":1},
 "disclaimer":"Estimates only. ..."}
```
How the numbers are worked out:
- **Crowd pressure** is a rule, not live demand. Expected attendance sets the base level (under 1,500 low, 1,500 to 4,999 medium, 5,000 and over high). It goes up one level if rides look scarce: fewer than 3 options, none at all, or the fastest more than 10 minutes away.
- **Leave-by** is the event start minus the fastest ride's ETA minus a buffer to arrive early (15 minutes for low, 30 for medium, 60 for high pressure). ETAs and fares are for right now, not for the event time.
- **Alternative drop-off** is only offered for medium or high pressure: the nearest landmark between 0.4 km and 2 km from the venue, if rides there are at least 15% cheaper or 3 minutes quicker.
- Rides with capacity 0 (for example parcel delivery) are ignored.

**GET /api/polling-stations** returns our own list of polling stations, grouped by `area`. This is a team sample, not the official IEBC register: a station with `"verified": true` was copied from the IEBC polling station list, every other station has not been checked against it. `location` is approximate (one point per area, `locationApproximate` is `true`), not the school gate.
```
curl https://iap-group11.onrender.com/api/polling-stations -H "X-API-Key: YOUR_KEY"
```
→ `200`
```json
[{"id":"ps_001","name":"Westlands Primary School","area":"Westlands","county":"Nairobi City","constituency":"Westlands","ward":"Parklands/Highridge","location":{"lat":-1.2673,"lng":36.8118},"locationApproximate":true,"verified":true}]
```

**GET /api/polling-stations/:stationId/nearest-landmark** finds the Group 10 landmark nearest to a polling station. Group 10's `/rides` only understands its own landmarks, so the page requests ride prices for this landmark. The prices are for the landmark area, not the exact station. Returns `422` if no landmark is within 15 km, and uses the saved landmark list if Group 10 is briefly unreachable.
```
curl https://iap-group11.onrender.com/api/polling-stations/ps_001/nearest-landmark -H "X-API-Key: YOUR_KEY"
```
→ `200`
```json
{"station":{"id":"ps_001","name":"Westlands Primary School","area":"Westlands"},"landmark":{"id":"2","name":"westlands","location":{"lat":-1.2673,"lng":36.811}},"distanceKm":0.1}
```

(Windows PowerShell users: use `curl.exe`, and put the JSON body in a file, then pass `--data-binary "@body.json"`.)

## Versioning

| URL | Version | List responses |
|---|---|---|
| `/api/...` | v1 (unversioned, kept so nothing breaks) | bare JSON array, **deprecated** |
| `/api/v1/...` | v1 | bare JSON array, **deprecated** |
| `/api/v2/...` | v2 | `{ "data": [...], "count": N }` |

The one breaking change: every endpoint that returned a list now wraps it as `{ data, count }` in v2. This covers `GET /candidates`, `/candidates/{id}/reviews`, `/rallies`, `/rallies/{id}/comments`, `/polling-stations` and `/transport/rides`. Single objects, POST and PUT bodies and error bodies are the same in both versions.

v1 list responses carry these headers:

```
Deprecation: true
Sunset: Fri, 13 Nov 2026 00:00:00 GMT
Link: </api/v2/candidates>; rel="successor-version"
```

Migrating a caller: change `/api/candidates` to `/api/v2/candidates` and read `body.data` instead of `body`. See `voter.fs/DEPRECATION_NOTICE.md`.

Upstream: we call Group 10's landmarks API through `voter.fs/db/partner.js`. Set `PARTNER_VERSION=v2` (default) or `v1` in `.env` to choose which of their versions we call. Run the tests with `npm run test:api` from `voter.fs`.

## Errors

Every error returns JSON in the form `{ "code": "...", "message": "..." }`.

| Request | Status | Body |
|---|---|---|
| `GET /api/candidates/nobody` (unknown candidate, also on `/reviews` GET and POST) | 404 | `{ "code": "NOT_FOUND", "message": "Candidate not found" }` |
| `GET .../reviews?minRating=abc` (not an integer from 1 to 5) | 400 | `{ "code": "INVALID_PARAMETER", "message": "minRating must be an integer between 1 and 5" }` |
| `GET /api/rallies?upcoming=maybe` (not true or false) | 400 | `{ "code": "INVALID_PARAMETER", "message": "upcoming must be true or false" }` |
| `GET /api/rallies/rally_99/travel?from=1` (unknown rally, or unknown landmark) | 404 | `{ "code": "NOT_FOUND", "message": "Rally not found" }` |
| `GET .../travel` without `from` | 400 | `{ "code": "INVALID_PARAMETER", "message": "from (a landmark id) is required" }` |
| `GET .../travel` for an event that has already ended | 409 | `{ "code": "EVENT_ENDED", "message": "This event has already ended" }` |
| `GET .../travel` when Group 10 cannot be reached | 502 | `{ "message": "Partner data unavailable" }` |
| `GET /api/polling-stations/ps_999/nearest-landmark` (unknown station) | 404 | `{ "code": "NOT_FOUND", "message": "Polling station not found" }` |
| `GET .../nearest-landmark` when no landmark is within 15 km | 422 | `{ "code": "NO_NEARBY_LANDMARK", "message": "No ride landmark within 15 km of this polling station" }` |
| `GET .../nearest-landmark` when Group 10 cannot be reached and nothing is saved | 502 | `{ "message": "Partner data unavailable" }` |
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