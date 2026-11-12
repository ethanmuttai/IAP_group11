// db/v2.js
// API versioning, done beside v1 so nothing that works today stops working.
//
//   /api/...      -> v1 (old URLs keep working, list responses are deprecated)
//   /api/v1/...   -> v1 (explicit alias of the same thing)
//   /api/v2/...   -> v2 (list responses are wrapped as { data, count })
//
// The only breaking change: every endpoint that returned a bare JSON array
// now returns { data: [...], count: N } in v2. Single-object endpoints,
// POST/PUT bodies and error shapes are identical in v1 and v2.
//
// IMPORTANT: this must be mounted with app.use(versioning), NOT
// app.use('/api', versioning). Express strips a mount path while a handler
// runs and restores it afterwards, which would undo the URL rewrite below.

const { deprecationHeaders } = require('./deprecate');

const VERSIONED = /^\/api\/(v1|v2)(?=\/|$)/;

function versioning(req, res, next) {
  const match = VERSIONED.exec(req.url);
  req.apiVersion = match ? match[1] : 'v1';

  // Rewrite /api/v2/x -> /api/x so one set of routes serves both versions.
  if (match) req.url = req.url.replace(VERSIONED, '/api');

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    // Only the list endpoints change shape; objects pass through untouched.
    if (Array.isArray(body)) {
      if (req.apiVersion === 'v2') {
        body = { data: body, count: body.length };
      } else {
        // A v1 caller received a bare array: that is the deprecated shape.
        const successor = '/api/v2' + req.url.replace(/^\/api/, '');
        deprecationHeaders(res, successor);
      }
    }
    return originalJson(body);
  };

  next();
}

module.exports = { versioning };