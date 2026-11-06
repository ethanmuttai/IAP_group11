const express = require('express');
const app = express();

let mode = 'ok'; // 'ok' | 'slow' | 'flaky' | 'error'
let calls = 0;

const sampleLandmarks = [
  { id: '1', name: 'Kenyatta National Hospital', location: { lat: -1.3005, lng: 36.8073 } },
  { id: '2', name: 'Nyayo National Stadium', location: { lat: -1.3039, lng: 36.8242 } }
];

// Switch behaviour without restarting: curl http://localhost:4000/_mode/slow
app.get('/_mode/:m', (req, res) => {
  mode = req.params.m;
  calls = 0;
  console.log(`[flaky-partner] Mode switched to: ${mode}`);
  res.json({ mode });
});

// Handler for incoming partner requests
const handleRequest = async (req, res) => {
  calls += 1;
  console.log(`[flaky-partner] ${req.method} ${req.path} (call #${calls}, mode: ${mode})`);

  if (mode === 'slow') {
    // Answers after 10 seconds
    await new Promise((r) => setTimeout(r, 10000));
  }

  if (mode === 'flaky' && calls % 3 !== 0) {
    // Fails twice (503), then works on the 3rd attempt
    return res.status(503).json({ message: 'Try again' });
  }

  if (mode === 'error') {
    // Always fails (500)
    return res.status(500).json({ message: 'Internal error' });
  }

  // OK mode
  res.json(sampleLandmarks);
};

app.get('/landmarks', handleRequest);
app.get('/tasks', handleRequest);
app.get('/rides', (req, res) => {
  res.json([
    { id: 'ride-1', providerName: 'Uber', rideType: 'Standard', fare: { amount: 350, currency: 'KES' }, etaMinutes: 6, capacity: 4 }
  ]);
});

app.listen(4000, () => console.log('Stand-in partner running on http://localhost:4000'));