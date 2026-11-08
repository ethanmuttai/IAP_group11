# Week 11: Resilience Engineering & Partner Failure Modes

## 1. Failure Mode Testing Matrix

| Failure Mode | Partner Behavior | User Experience | Server Log Output |
| :--- | :--- | :--- | :--- |
| **Partner Stopped** | Cloudflare tunnel dropped / connection refused | Saved landmarks render with banner: *"Showing saved data from [time]..."* | `Landmarks partner call failed: fetch failed` (ECONNREFUSED) |
| **Partner Slow** | 10-second delay per call (`/_mode/slow`) | Page waits ~5.1s, then gracefully serves cached landmarks with timestamp banner | `[resilientFetch] Attempt 1 failed (timeout)... Attempt 2 failed (timeout)... Attempt 3 failed (timeout)...` |
| **Partner Flaky** | Fails twice with 503, succeeds on 3rd attempt | Seamless live load; user notices zero downtime or UI error | `[resilientFetch] Attempt 1 returned 503... Attempt 2 returned 503...` (Attempt 3 resolved 200 OK) |
| **Partner Error (500)** | Unhandled backend crash returning HTTP 500 | Graceful fallback to cached data with warning banner (or friendly 502 if cold start) | `[resilientFetch] Attempt 1 returned 500... Attempt 2 returned 500... Landmarks partner call failed` |

---

## 2. Parameter Tuning & Arithmetic

- **Timeout (`timeoutMs`):** `1500ms` (1.5 seconds)
  - *Rationale:* Under normal network conditions, Group 10's endpoints resolve in ~100–350ms. Setting the cutoff at 1500ms allows sufficient headroom for transient mobile network latency while aggressively mitigating thread stalls.
- **Max Retries (`retries`):** `2` (3 total attempts)
  - *Rationale:* Two retries provide sufficient recovery for transient 503 gateway drops or container restarts without swamping the partner upstream with retry storms.
- **Initial Delay (`delayMs`):** `200ms` exponential backoff (`delayMs * 2^attempt`)
  - *Progression:* 200ms before retry 1, 400ms before retry 2. If HTTP 429 is encountered, the backoff strictly honors the partner's `Retry-After` header capped at 5 seconds.
- **Worst-Case Wait Calculation:**
  $$\text{Worst Case} = (\text{retries} + 1) \times \text{timeout} + \sum \text{delays}$$
  $$\text{Worst Case} = (2 + 1) \times 1500\text{ms} + 200\text{ms} + 400\text{ms} = 5100\text{ms}\ (5.1\text{s})$$
  A ~5-second threshold remains within acceptable user tolerance for external transport fare calculation without triggering a browser-level navigation abort.

---

## 3. Real User Experience Without Resilience Code

Without this resilience implementation, any upstream degradation in Group 10’s transit service would completely brick the voter tool's Polling Station Locator. When navigating to `/get-there`, a hanging upstream server would leave the dropdown inputs permanently disabled while the browser tab spins indefinitely until the browser's default timeout (often 60–120 seconds). Under intermittent failures, voters would see arbitrary red error alerts and empty ride tables, leading them to believe the entire civic platform was broken. In desperation, voters would repeatedly mash the "Compare Rides" button, generating an accidental denial-of-service flood against our partner's struggling backend.

---

## 4. Architectural Scope: Circuit Breaker Omission

While our implementation caps retries at 2 with exponential backoff and provides in-memory fallback, it does not implement a full circuit breaker pattern; every incoming client request will still execute the 3-attempt retry loop against a persistently downed partner rather than "tripping" open into an immediate local fallback state to completely cease external network traffic during extended outages.