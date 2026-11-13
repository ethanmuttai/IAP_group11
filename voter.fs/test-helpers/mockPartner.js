// A tiny stand-in for Group 10's API, for tests. Not a test file itself.
const http = require('http');

const LANDMARKS = [
  { id: '1', name: 'westlands', location: { lat: -1.2676, lng: 36.8123 } },
  { id: '2', name: 'cbd', location: { lat: -1.2833, lng: 36.8172 } },
  { id: '11', name: 'ruaka', location: { lat: -1.2034, lng: 36.7545 } },
  { id: '33', name: 'strathmore university', location: { lat: -1.3093, lng: 36.8128 } }
];

const RIDES = [
  { id: 'r1', providerName: 'Bolt', rideType: 'Bolt Boda', fare: { amount: 120, currency: 'KES' }, etaMinutes: 4, capacity: 1 },
  { id: 'r2', providerName: 'Uber', rideType: 'Uber Chapchap', fare: { amount: 250, currency: 'KES' }, etaMinutes: 6, capacity: 4 },
  { id: 'r3', providerName: 'Uber', rideType: 'UberXL', fare: { amount: 400, currency: 'KES' }, etaMinutes: 8, capacity: 6 },
  { id: 'r4', providerName: 'Bolt', rideType: 'Bolt Send', fare: { amount: 90, currency: 'KES' }, etaMinutes: 3, capacity: 0 }
];

// state.landmarks / state.rides can be changed between tests.
// state.down = true makes every call answer 500.
function startMockPartner() {
  const state = { landmarks: LANDMARKS, rides: RIDES, down: false, seen: [] };
  const server = http.createServer((req, res) => {
    state.seen.push(req.url);
    res.setHeader('Content-Type', 'application/json');
    if (state.down) { res.statusCode = 500; return res.end('{}'); }
    if (req.url === '/v2/landmarks') {
      return res.end(JSON.stringify({ data: state.landmarks, count: state.landmarks.length }));
    }
    if (req.url.startsWith('/rides')) return res.end(JSON.stringify(state.rides));
    res.statusCode = 404;
    res.end('{}');
  });
  return new Promise((resolve) => {
    server.listen(0, () => {
      process.env.PARTNER_URL = `http://localhost:${server.address().port}`;
      resolve({
        state,
        close: () => new Promise((r) => { server.closeAllConnections(); server.close(() => r()); })
      });
    });
  });
}

module.exports = { startMockPartner, LANDMARKS, RIDES };