# Versioning notes (Week 13)

## The change we made

Lists changed from a bare array to `{ data, count }`, in v2 only. v1 is untouched.
Details and URLs: see README "Versioning" and `DEPRECATION_NOTICE.md`.

## How it works

- `db/v2.js`: one middleware rewrites `/api/v2/x` to `/api/x` and wraps array responses. It is mounted with a plain `app.use`, not `app.use('/api', ...)`, because Express restores the stripped path afterwards and would undo the rewrite.
- `db/deprecate.js`: the Deprecation, Sunset and Link headers. The date lives in one line.
- `db/monitoring.js`: logs the original URL and puts `/api/v1` or `/api/v2` in the `/stats` route labels, so `/stats` shows who still uses v1.
- `db/partner.js`: the only code that knows Group 10's landmark shapes. `PARTNER_VERSION` in `.env` switches between their v1 and v2.
- Tests: `npm run test:api` (`versions.test.js`, `partner.test.js`).

## Part A: what we did as the consumer of Group 10

Group 10 deprecated `GET /landmarks` and `GET /landmarks/{id}`. Their v2 is `/v2/landmarks` and `/v2/landmarks/{id}`, wrapped as `{ data, count }` or `{ data }`. We only call the list. We switched to v2 by default, kept `PARTNER_VERSION=v1` as a rollback, and made a wrong shape throw `unexpected v2 shape` (logged as `Landmarks partner call failed`) rather than return an empty list.

## Question for Group 10 (send this)

Your notice gives two dates. The Sunset header says Fri 13 Nov 2026 but the text says v1 stops working on Wed 25 Nov 2026. Which one is correct? We are planning for 13 Nov.

## Open items for the team

- **Group 12:** send `DEPRECATION_NOTICE.md` and ask them to reply. Our sunset is 13 Nov, so they get very little time. Decide whether to move our sunset date (one line in `db/deprecate.js`).
- **Prediction for Group 12's code:** ask them what they think will break (probably anything that calls `.map` or `.length` on the response). Write their answer here: _______
- **Who still uses v1:** open `/stats` and look at the unversioned and `/api/v1/` route labels. Their callers appear in the request log as `key-xxxxxx`. Write what you saw here: _______
- **Real Group 10 v2:** test against their live server before the demo:
  `curl -s -H "X-API-Key: <our key>" <PARTNER_URL>/v2/landmarks`. We only tested against a mock that follows their notice.

## Reflection (write this in your own words)

1. What was hard about making a breaking change without breaking Group 12?

2. What did the deprecation headers actually help with, and what could they not do?

3. What would you do differently next time (for example, version from day one)?