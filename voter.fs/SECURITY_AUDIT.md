# Security Audit (Week 9/11)

## Checked

- **Sensitive Data & Leaks:** looked through SQLite tables and API handlers to make sure we aren't returning anything unnecessary (eg internal DB IDs). Everything returned by our endpoints is public data meant for the frontend.
- **Error Responses:** Tested bad requests and unknown routes to check that our error handlers don't output raw stack traces, SQL queries, or local directory paths. All error responses use a clean `{ code, message }` JSON format.
- **Key Safety:** Checked `.gitignore` to ensure `.env` is hidden and won't get pushed to GitHub.`.env.example` will act as a reference template for team members.
- **Endpoint Protection:** Verified that all endpoints require a valid `X-API-Key` header and reject invalid or missing keys with a `401 Unauthorized` response.

## Fixed

- **Added Global Auth Middleware:** Previously, our GET routes were open. Added `requireApiKey` globally in `db/server.js` to enforce header authentication across all routes.
- **Added Rate Limiting:** Built an in-memory rate limiter to prevent script abuse or rapid infinite loops from taking down the Node server.

## Rate Limit Threshold & Reasoning

- **Selected Limit:** 100 requests per minute per API key.
- **Why 100/min?:** It gives plenty of headroom for normal browsing and dropdown fetching on the React frontend, but strictly blocks automated scripts, scrapers, or runaway loops before they hit our SQLite database. When exceeded, the server returns a `429 Too Many Requests` status along with a standard `Retry-After` header.