// db/partner.js
// The ONLY place that knows what Group 10's landmarks response looks like.
// Everything else in the server works with a plain array of landmarks.
//
//   v1: GET /landmarks     -> [ {...}, {...} ]
//   v2: GET /v2/landmarks  -> { data: [ {...}, {...} ], count: N }
//
// Pick the version with PARTNER_VERSION=v1 or v2 in .env (default v2).
// To roll back after a bad deploy: set PARTNER_VERSION=v1 and restart.
// Group 10 stops serving v1 on or after their sunset date.

function partnerVersion() {
  return process.env.PARTNER_VERSION === 'v1' ? 'v1' : 'v2';
}

function landmarksPath(version = partnerVersion()) {
  return version === 'v1' ? '/landmarks' : '/v2/landmarks';
}

// Turn the partner's response body into a plain array, or throw loudly.
// Throwing matters: if we quietly returned [] on a shape we do not
// recognise, the app would show an empty list and nobody would know why.
function parseLandmarks(body, version = partnerVersion()) {
  if (version === 'v1') {
    if (!Array.isArray(body)) throw new Error('unexpected v1 shape');
    return body;
  }
  if (!body || !Array.isArray(body.data)) throw new Error('unexpected v2 shape');
  return body.data;
}

module.exports = { partnerVersion, landmarksPath, parseLandmarks };