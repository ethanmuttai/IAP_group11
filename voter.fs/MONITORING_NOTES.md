# Week 12: API Monitoring & Observability Notes

## Part A: Initial Predictions (Prior to Data Collection)

1. **Slowest Endpoint Prediction:**
   - **Hypothesis:** `GET /api/candidates` was predicted to be the slowest local endpoint due to executing a SQLite `LEFT JOIN` against the `candidate_ratings` aggregate view, while external partner calls (`/api/transport/*`) would dominate overall if active.
2. **Most Errors Prediction:**
   - **Hypothesis:** `GET /api/candidates/:candidateId` and unmapped routes were expected to generate the most client errors (4xx) due to unknown IDs and missing route patterns, while 5xx errors would stay near zero in local execution.

---

## Part E: Empirical Data Analysis & Findings

### 1. Predicted vs. Actual Metrics
- **Slowest Route:** 
  - *Actual:* `GET /api/candidates/:candidateId` had the highest average response time at **1.8 ms** (max **3.8 ms**), slightly edging out `GET /api/candidates` at **1.6 ms** (max **2.3 ms**).
  - *Reflection:* The prediction was partially accurate; while both database queries took under 2 ms, the parameterized lookup had a slightly wider spread due to branch execution when evaluating candidate existence and returning 404s.
- **Most Errors:**
  - *Actual:* `GET (no route)` accumulated **25 client errors** (a mixture of 401 unauthorized rejections and 404s for `/api/not-a-real-route`). Among registered application routes, `GET /api/candidates/:candidateId` produced **4 client errors** (404 Not Found for non-existent candidate slugs).
  - *Server Errors:* `serverErrors: 0` (`errorRatePercent: 0%`).

### 2. Concrete Traffic Pattern Identified
During the 60-request evaluation burst (`uptimeSeconds: 59`), `GET (no route)` accounted for **41.7% of all incoming traffic** (25 requests) with an average latency of **0.9 ms** and an outlier peak of **6.2 ms**. Of these, 9 requests were HTTP 401 rejections lacking the `X-API-Key` header, which were rejected in under 1 ms by the security middleware before hitting route handlers.

### 3. Root Cause Hypothesis & Investigation Plan
- **Hypothesis:** The peak latency of **6.2 ms** on `GET (no route)` occurred on the very first incoming request during initial middleware stack evaluation and JIT compilation in the Node runtime.
- **Next Steps:** To confirm, I would cross-reference the timestamps in `requests.log` with the latency reading: if the first `status: 401` line corresponds to the 6.2 ms measurement while all subsequent 401s took 0.7–1.3 ms, the outlier is confirmed to be cold-path initialization overhead rather than I/O bottlenecks.

### 4. Production Alerting Strategy
- **Metric to Alert On:** `errorRatePercent` (Server Errors: HTTP 500, 502, 503).
- **Threshold:** Alert fires if `errorRatePercent > 5%` sustained over a rolling 5-minute window.
- **Automated Mitigation:** While on-call engineers are paged, the frontend application must automatically fail over to the in-memory fallback cache (implemented in Week 11), serving stale timestamped snapshots with a user-facing banner rather than exposing blank error screens.