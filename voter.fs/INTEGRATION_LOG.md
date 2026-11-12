# Integration Log

| # | What broke | Root cause | Fix | Whose code |
|---|---|---|---|---|
| 1 | `curl` returned "Could not resolve host" | Cloudflare tunnel expired when partner restarted server | Group 10 provided new tunnel URL (`employ-attractions-...`) | Partner, fixed by partner |
| 2 | `GET /landmarks/lmk_001` returned 404 | Live API uses numeric IDs (`"1"`, `"2"`) instead of contract IDs (`"lmk_001"`) | Updated client code to query using numeric IDs returned from `/landmarks` | Partner contract mismatch |
| 3 | `rideType` returned unexpected strings (e.g. `"Uber Chapchap"`) | Live API returns brand-specific strings rather than contract enum (`Boda`, `Standard`, `XL`) | Adapted UI mapping to handle branded `rideType` values | Partner contract mismatch |
| 4 | Parcel delivery options appear in passenger ride results | Live API includes parcel options with `capacity: 0` (e.g., Bolt Send) | Added `.filter(ride => ride.capacity > 0)` in backend proxy | Our code |
| 5 | Group 10 announced `GET /landmarks` (v1) is deprecated; v2 at `/v2/landmarks` wraps the list as `{ data, count }`. Their notice has two different end dates (Sunset header Fri 13 Nov 2026, text says Wed 25 Nov 2026) | Breaking response-shape change by the upstream partner | Added `db/partner.js` (one place that parses landmarks), `PARTNER_VERSION` switch (v2 default, v1 rollback), wrong-shape now throws `unexpected v2 shape` instead of showing an empty list, `partner.test.js` | Partner change, our adaptation |