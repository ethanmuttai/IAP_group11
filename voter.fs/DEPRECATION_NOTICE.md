# Deprecation notice: Voter Edu API v1 list responses

**To:** Group 12 (AccessMap Nairobi)
**From:** Group 11 (Voter Edu)
**Date sent:** _11 November 2026_
**Please reply when you have read this:** _(fill in contact)_

## What is changing

Every Voter Edu endpoint that returns a list now has a v2 that wraps the list.

| | v1 (deprecated) | v2 |
|---|---|---|
| URL | `/api/candidates` or `/api/v1/candidates` | `/api/v2/candidates` |
| Body | `[ {...}, {...} ]` | `{ "data": [ {...}, {...} ], "count": 2 }` |

Affected endpoints: `GET /candidates`, `GET /candidates/{id}/reviews`, `GET /rallies`, `GET /rallies/{id}/comments`, `GET /polling-stations`, `GET /transport/rides`.

Not affected: single-object responses (for example `GET /candidates/{id}`), POST and PUT bodies, and error bodies (`{ "code", "message" }`).

## Why

A bare array has no room to grow. Wrapping it lets us add `count` now and paging or metadata later without breaking you again.

## Nothing breaks today

v1 keeps working exactly as before. Its list responses now carry:

```
Deprecation: true
Sunset: Fri, 13 Nov 2026 00:00:00 GMT
Link: </api/v2/candidates>; rel="successor-version"
```

## What you need to do

1. Change the URL from `/api/...` to `/api/v2/...`.
2. Read `response.data` (the array) instead of the response itself. `response.count` is the number of items.
3. Check that nothing else in your code assumes the response is an array (`.map`, `.length`, `Array.isArray` on the whole body).

Before:

```js
const candidates = await (await fetch(`${BASE}/api/candidates`, { headers })).json();
candidates.map(c => c.name);
```

After:

```js
const body = await (await fetch(`${BASE}/api/v2/candidates`, { headers })).json();
body.data.map(c => c.name);
```

## Timeline

| Date | What happens |
|---|---|
| Now | v2 is live next to v1. v1 sends Deprecation and Sunset headers. |
| 13 Nov 2026 | Sunset date in the headers. After this date v1 list responses may be removed. |

Note: this notice goes out close to the sunset date. If you need more time, tell us and we will keep v1 running longer and update the Sunset header.

## Test it

```
curl -i -H "X-API-Key: <your key>" http://<our-host>/api/v2/candidates
```

You should see `{ "data": [...], "count": N }` and no Deprecation header.