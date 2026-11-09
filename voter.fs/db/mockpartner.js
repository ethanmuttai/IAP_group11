// LOCAL TESTING ONLY. Stand-in for Group 10's RideCompare API with MADE-UP fares and ETAs.
// Run:  node mock-partner.js   then set PARTNER_URL=http://localhost:5099 in voter.fs/.env and restart the backend.
// Put the real PARTNER_URL back before the demo. Same shapes as the live API:
//   GET /landmarks -> [{ id, name, location: { lat, lng } }]
//   GET /rides?pickup_lat&pickup_lng&dropoff_lat&dropoff_lng
//        -> [{ id, providerName, rideType, fare: { amount, currency }, etaMinutes, capacity }]
const express = require('express');
const app = express();

const LANDMARKS = [
  { id: '1',  name: 'cbd',              location: { lat: -1.2864, lng: 36.8172 } },
  { id: '2',  name: 'westlands',        location: { lat: -1.2673, lng: 36.8110 } },
  { id: '3',  name: 'kilimani',         location: { lat: -1.2920, lng: 36.7870 } },
  { id: '4',  name: 'uhuru park',       location: { lat: -1.2985, lng: 36.8175 } },   // ~0.7 km from Nyayo
  { id: '5',  name: 'railway station',  location: { lat: -1.2905, lng: 36.8280 } },   // ~1.5 km from Nyayo
  { id: '6',  name: 'karen',            location: { lat: -1.3328, lng: 36.7198 } },
  { id: '7',  name: 'thika',            location: { lat: -1.0333, lng: 37.0693 } }
];

function km(a, b) {
  const r = d => d * Math.PI / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 +
    Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

app.get('/landmarks', (req, res) => res.json(LANDMARKS));

app.get('/rides', (req, res) => {
  const a = { lat: +req.query.pickup_lat, lng: +req.query.pickup_lng };
  const b = { lat: +req.query.dropoff_lat, lng: +req.query.dropoff_lng };
  const d = km(a, b);
  if (d > 12) {  // scarce supply far out: one slow option
    return res.json([{ id: 'r1', providerName: 'Uber', rideType: 'Uber Chapchap',
      fare: { amount: Math.round(80 + 45 * d), currency: 'KES' }, etaMinutes: 18, capacity: 4 }]);
  }
  res.json([
    { id: 'r1', providerName: 'Bolt', rideType: 'Bolt Boda',  fare: { amount: Math.round(40 + 28 * d), currency: 'KES' }, etaMinutes: Math.round(3 + d * 0.8), capacity: 1 },
    { id: 'r2', providerName: 'Uber', rideType: 'Uber Chapchap', fare: { amount: Math.round(90 + 52 * d), currency: 'KES' }, etaMinutes: Math.round(5 + d * 1.2), capacity: 4 },
    { id: 'r3', providerName: 'Uber', rideType: 'UberXL',    fare: { amount: Math.round(160 + 80 * d), currency: 'KES' }, etaMinutes: Math.round(7 + d * 1.2), capacity: 6 },
    { id: 'r4', providerName: 'Bolt', rideType: 'Bolt Send', fare: { amount: 120, currency: 'KES' }, etaMinutes: 4, capacity: 0 }  // parcel: must be filtered out
  ]);
});

app.listen(process.env.PORT || 5099, () => console.log('MOCK partner (made-up data) listening on port ' + (process.env.PORT || 5099)));