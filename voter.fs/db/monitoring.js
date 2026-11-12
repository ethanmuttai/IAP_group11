// db/monitoring.js
const crypto = require('crypto');

const round = (n) => Math.round(n * 10) / 10;

// In-memory metrics state (Part C)
const stats = {
  startedAt: new Date().toISOString(),
  total: 0,
  clientErrors: 0, // 4xx: usually the caller's mistake
  serverErrors: 0, // 5xx: our fault
  totalMs: 0,
  routes: {},
};

function newRoute() {
  return { count: 0, clientErrors: 0, serverErrors: 0, totalMs: 0, maxMs: 0 };
}

// Fingerprint caller without logging the secret key
function who(req) {
  const key = req.apiKey || req.get('X-API-Key');
  if (!key) return 'none';
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return 'key-' + hash.slice(0, 6);
}

// Request logging middleware (Part B)
function monitor(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;

    // 1. Log JSON line to stdout (No keys, bodies, or query strings logged)
    console.log(JSON.stringify({
      time: new Date().toISOString(),
      method: req.method,
      // originalUrl keeps /api/v2/... (req.path is rewritten by db/v2.js)
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      ms: round(ms),
      caller: who(req),
    }));

    // 2. Accumulate metrics grouped by route pattern (Part C)
    // Explicit /api/v1 or /api/v2 callers get their version in the label, so
    // /stats shows who still uses v1. Unversioned /api/... stays as it is.
    let route = req.route ? (req.baseUrl || '') + req.route.path : '(no route)';
    if (req.route && /^\/api\/(v1|v2)(\/|$)/.test(req.originalUrl)) {
      route = route.replace(/^\/api/, '/api/' + req.originalUrl.split('/')[2]);
    }
    const label = `${req.method} ${route}`;

    const r = stats.routes[label] || newRoute();
    stats.routes[label] = r;

    stats.total += 1;
    stats.totalMs += ms;
    r.count += 1;
    r.totalMs += ms;
    r.maxMs = Math.max(r.maxMs, ms);

    if (res.statusCode >= 500) {
      stats.serverErrors += 1;
      r.serverErrors += 1;
    } else if (res.statusCode >= 400) {
      stats.clientErrors += 1;
      r.clientErrors += 1;
    }
  });

  next();
}

// Handler for GET /stats
function statsHandler(req, res) {
  const routes = {};
  for (const [label, r] of Object.entries(stats.routes)) {
    routes[label] = {
      count: r.count,
      clientErrors: r.clientErrors,
      serverErrors: r.serverErrors,
      avgMs: round(r.count ? r.totalMs / r.count : 0),
      maxMs: round(r.maxMs),
    };
  }

  const rate = stats.total ? (stats.serverErrors / stats.total) * 100 : 0;
  const avg = stats.total ? stats.totalMs / stats.total : 0;

  res.json({
    startedAt: stats.startedAt,
    uptimeSeconds: Math.round(process.uptime()),
    total: stats.total,
    clientErrors: stats.clientErrors,
    serverErrors: stats.serverErrors,
    errorRatePercent: round(rate),
    avgMs: round(avg),
    routes,
  });
}

module.exports = { monitor, statsHandler };