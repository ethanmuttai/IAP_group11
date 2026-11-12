// db/deprecate.js
// Marks a response as coming from a deprecated API version.
// Headers follow RFC 9745 (Deprecation) and RFC 8594 (Sunset).

// 13 Nov 2026, 00:00 UTC. Change this one line to move the date.
const SUNSET_DATE = new Date('2026-11-13T00:00:00Z');

function deprecationHeaders(res, successorPath) {
  res.set('Deprecation', 'true');
  res.set('Sunset', SUNSET_DATE.toUTCString());
  res.set('Link', `<${successorPath}>; rel="successor-version"`);
}

module.exports = { deprecationHeaders, SUNSET_DATE };