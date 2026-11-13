const request = require('supertest');
const { startMockPartner, LANDMARKS } = require('../test-helpers/mockPartner');

let mock;
let app;
const get = (url) => request(app).get(url).set('X-API-Key', 'test-key');

beforeAll(async () => {
  mock = await startMockPartner();
  app = require('../db/server');
});
afterAll(() => mock.close());
beforeEach(() => { mock.state.down = false; mock.state.landmarks = LANDMARKS; });

describe('GET /api/polling-stations', () => {
  test('returns stations with the contract fields', async () => {
    const res = await get('/api/polling-stations');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(50);
    for (const s of res.body) {
      expect(s.id).toMatch(/^ps_\d{3}$/);
      expect(typeof s.name).toBe('string');
      expect(typeof s.area).toBe('string');
      expect(typeof s.county).toBe('string');
      expect(typeof s.location.lat).toBe('number');
      expect(typeof s.location.lng).toBe('number');
      expect(s.locationApproximate).toBe(true);
      expect(typeof s.verified).toBe('boolean');
    }
  });

  test('ids are unique and the verified ones are the five IEBC Westlands stations', async () => {
    const res = await get('/api/polling-stations');
    expect(new Set(res.body.map(s => s.id)).size).toBe(res.body.length);
    const verified = res.body.filter(s => s.verified).map(s => s.name).sort();
    expect(verified).toEqual([
      'Bhora Primary School', 'Hospital Hill Primary School', 'Muguga Green Primary School',
      'Visa Oshwal Primary School', 'Westlands Primary School'
    ]);
  });
});

describe('GET /api/polling-stations/:stationId/nearest-landmark', () => {
  test('502 when the partner is down and nothing is saved yet', async () => {
    mock.state.down = true;
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await get('/api/polling-stations/ps_001/nearest-landmark');
    err.mockRestore();
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ message: 'Partner data unavailable' });
  });

  test('returns the closest landmark and the distance', async () => {
    const res = await get('/api/polling-stations/ps_001/nearest-landmark');
    expect(res.status).toBe(200);
    expect(res.body.station).toEqual({ id: 'ps_001', name: 'Westlands Primary School', area: 'Westlands' });
    expect(res.body.landmark).toEqual({ id: '1', name: 'westlands', location: { lat: -1.2676, lng: 36.8123 } });
    expect(typeof res.body.distanceKm).toBe('number');
    expect(res.body.distanceKm).toBeLessThan(1);
  });

  test('picks a different landmark for a station in a different area (Ruaka)', async () => {
    const stations = (await get('/api/polling-stations')).body;
    const ruaka = stations.find(s => s.name === 'Ruaka Primary School');
    const res = await get(`/api/polling-stations/${ruaka.id}/nearest-landmark`);
    expect(res.status).toBe(200);
    expect(res.body.landmark.name).toBe('ruaka');
  });

  test('404 for an unknown station', async () => {
    const res = await get('/api/polling-stations/ps_999/nearest-landmark');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ code: 'NOT_FOUND', message: 'Polling station not found' });
  });

  test('422 when no landmark is within 15 km', async () => {
    mock.state.landmarks = [{ id: '7', name: 'thika', location: { lat: -1.0333, lng: 37.0693 } }];
    const res = await get('/api/polling-stations/ps_001/nearest-landmark');
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      code: 'NO_NEARBY_LANDMARK',
      message: 'No ride landmark within 15 km of this polling station'
    });
  });

  test('uses the saved landmark list when the partner is down', async () => {
    // one good call first, so there is a saved list to fall back on
    expect((await get('/api/polling-stations/ps_001/nearest-landmark')).status).toBe(200);
    mock.state.down = true;
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await get('/api/polling-stations/ps_001/nearest-landmark');
    err.mockRestore();
    expect(res.status).toBe(200);
  });
});