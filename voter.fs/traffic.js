// traffic.js: sends a mix of requests to your VoterEdu API to populate metrics.
// Run: node traffic.js
const API = process.env.API || 'http://localhost:5000';
const KEY = process.env.KEY || 'cd4eb67fbb67b76473b4e323b3b53b573c43735a5f197b36';
const N = Number(process.env.N || 60);

const mix = [
  { method: 'GET', path: '/api/candidates', key: true },
  { method: 'GET', path: '/api/candidates', key: true },
  { method: 'GET', path: '/api/candidates/ruto', key: true },
  { method: 'GET', path: '/api/candidates/invalid-candidate-99', key: true }, // Expect 404
  { method: 'GET', path: '/api/rallies', key: true },
  { method: 'GET', path: '/api/candidates', key: false }, // Missing key -> Expect 401
  { method: 'GET', path: '/api/not-a-real-route', key: true }, // Expect 404
];

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const counts = {};
  console.log(`Sending ${N} requests to ${API}...`);

  for (let i = 0; i < N; i++) {
    const r = mix[Math.floor(Math.random() * mix.length)];
    try {
      const res = await fetch(API + r.path, {
        method: r.method,
        headers: r.key ? { 'X-API-Key': KEY } : {},
      });
      counts[res.status] = (counts[res.status] || 0) + 1;
    } catch (err) {
      counts.failed = (counts.failed || 0) + 1;
    }
    await pause(50);
  }

  console.log('Status codes received:', counts);
})();