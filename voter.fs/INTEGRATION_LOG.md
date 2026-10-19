# Integration Log

| # | What broke | Root cause | Fix | Whose code |
|---|---|---|---|---|
| 1 | `curl` returned "Could not resolve host" | Cloudflare tunnel expired when partner restarted server | Group 10 provided new tunnel URL (`employ-attractions-...`) | Partner, fixed by partner |
| 2 | `GET /landmarks/lmk_001` returned 404 | Live API uses numeric IDs (`"1"`, `"2"`) instead of contract IDs (`"lmk_001"`) | Updated client code to query using numeric IDs returned from `/landmarks` | Partner contract mismatch |
| 3 | `rideType` returned unexpected strings (e.g. `"Uber Chapchap"`) | Live API returns brand-specific strings rather than contract enum (`Boda`, `Standard`, `XL`) | Adapted UI mapping to handle branded `rideType` values | Partner contract mismatch |
| 4 | Parcel delivery options appear in passenger ride results | Live API includes parcel options with `capacity: 0` (e.g., Bolt Send) | Added `.filter(ride => ride.capacity > 0)` in backend proxy | Our code |