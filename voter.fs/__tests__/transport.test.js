const request = require('supertest');
const { startMockPartner } = require('../test-helpers/mockPartner');

let mock;
let app;
const get = (url) => request(app).get(url).set('X-API-Key', 'test-key');

beforeAll(async () => {
  mock = await startMockPartner();
  app = require('../db/server');
});
afterAll(() => mock.close());
beforeEach(() => {
  mock.state.down = false;
  mock.state.seen.length = 0;
});

describe('GET /api/transport/landmarks', () => {
  test('502 when the partner is down and nothing is saved yet', async () => {
    mock.state.down = true;
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await get('/api/transport/landmarks');
    err.mockRestore();
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ message: 'Landmark data unavailable' });
  });

  test('returns fresh landmarks with stale:false and an asof time', async () => {
    const res = await get('/api/transport/landmarks');
    expect(res.status).toBe(200);
    expect(res.body.stale).toBe(false);
    expect(Date.parse(res.body.asof)).not.toBeNaN();
    expect(res.body.data.length).toBe(4);
    expect(res.body.data[0]).toEqual({ id: '1', name: 'westlands', location: { lat: -1.2676, lng: 36.8123 } });
    expect(mock.state.seen).toContain('/v2/landmarks');
  });

  test('serves the saved copy with stale:true when the partner goes down', async () => {
    mock.state.down = true;
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await get('/api/transport/landmarks');
    err.mockRestore();
    expect(res.status).toBe(200);
    expect(res.body.stale).toBe(true);
    expect(res.body.data.length).toBe(4);
    expect(Date.parse(res.body.asof)).not.toBeNaN();
  });
});

describe('GET /api/transport/rides', () => {
  test('passes the coordinates to the partner and drops parcel options (capacity 0)', async () => {
    const res = await get('/api/transport/rides?pickup_lat=-1.28&pickup_lng=36.81&dropoff_lat=-1.30&dropoff_lng=36.83');
    expect(res.status).toBe(200);
    expect(res.body.map(r => r.id)).toEqual(['r1', 'r2', 'r3']);
    expect(res.body.every(r => r.capacity > 0)).toBe(true);
    for (const r of res.body) {
      expect(typeof r.providerName).toBe('string');
      expect(typeof r.rideType).toBe('string');
      expect(typeof r.fare.amount).toBe('number');
      expect(r.fare.currency).toBe('KES');
      expect(typeof r.etaMinutes).toBe('number');
    }
    const url = mock.state.seen.find(u => u.startsWith('/rides'));
    expect(url).toContain('pickup_lat=-1.28');
    expect(url).toContain('dropoff_lng=36.83');
  });

  test('uses default coordinates when none are given', async () => {
    const res = await get('/api/transport/rides');
    expect(res.status).toBe(200);
    const url = mock.state.seen.find(u => u.startsWith('/rides'));
    expect(url).toContain('pickup_lat=-1.2864');
    expect(url).toContain('dropoff_lat=-1.3197');
  });

  test('an empty partner list is an empty array, not an error', async () => {
    const saved = mock.state.rides;
    mock.state.rides = [];
    const res = await get('/api/transport/rides');
    mock.state.rides = saved;
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('502 { message } when the partner is down', async () => {
    mock.state.down = true;
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await get('/api/transport/rides');
    err.mockRestore();
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ message: 'Partner data unavailable' });
  });
});