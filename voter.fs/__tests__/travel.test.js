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
beforeEach(() => { mock.state.down = false; });

describe('GET /api/rallies/:rallyId/travel', () => {
  test('404 for an unknown rally', async () => {
    const res = await get('/api/rallies/rally_99/travel?from=1');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ code: 'NOT_FOUND', message: 'Rally not found' });
  });

  test.each(['', '?from=', '?from=%20'])('400 when from is missing (%p)', async (q) => {
    const res = await get(`/api/rallies/rally_14/travel${q}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ code: 'INVALID_PARAMETER', message: 'from (a landmark id) is required' });
  });

  test('502 when the partner is down and nothing is saved', async () => {
    mock.state.down = true;
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await get('/api/rallies/rally_14/travel?from=1');
    err.mockRestore();
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ message: 'Partner data unavailable' });
  });

  test('404 for a landmark that does not exist', async () => {
    const res = await get('/api/rallies/rally_14/travel?from=999');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ code: 'NOT_FOUND', message: 'Landmark not found' });
  });

  test('returns the full advice object for a valid request', async () => {
    const res = await get('/api/rallies/rally_14/travel?from=1');
    expect(res.status).toBe(200);
    expect(res.body.rally).toMatchObject({ id: 'rally_14', startTime: '10:30', endTime: '14:00', expectedCrowd: '4,500' });
    expect(res.body.from).toEqual({ id: '1', name: 'westlands' });
    expect(res.body.rides.count).toBe(3);               // parcel option dropped
    expect(res.body.rides.fastest.id).toBe('r1');
    expect(res.body.rides.cheapest.id).toBe('r1');
    expect(res.body.leaveBy.date).toBe(res.body.rally.date);
    expect(res.body.leaveBy.time).toMatch(/^\d{2}:\d{2}$/);
    expect(typeof res.body.leaveBy.leaveNow).toBe('boolean');
    expect(res.body.disclaimer).toMatch(/Estimates only/);
  });

  test('pressure follows the rule: 4,500 expected and 3 quick rides is medium with a 30 minute buffer', async () => {
    const res = await get('/api/rallies/rally_14/travel?from=1');
    expect(res.body.pressure.expectedCrowdNumber).toBe(4500);
    expect(res.body.pressure.level).toBe('medium');
    expect(res.body.pressure.bufferMinutes).toBe(30);
    expect(res.body.leaveBy.bufferMinutes).toBe(30);
    expect(res.body.leaveBy.basedOnEtaMinutes).toBe(4);
  });

  test('leave-by time is event start minus ETA minus buffer (10:30 - 4 - 30 = 09:56)', async () => {
    const res = await get('/api/rallies/rally_14/travel?from=1');
    expect(res.body.leaveBy.time).toBe('09:56');
  });

  test('scarce supply (no rides) raises the pressure level and is explained', async () => {
    const saved = mock.state.rides;
    mock.state.rides = [];
    const res = await get('/api/rallies/rally_14/travel?from=1');
    mock.state.rides = saved;
    expect(res.status).toBe(200);
    expect(res.body.pressure.level).toBe('high');
    expect(res.body.pressure.bufferMinutes).toBe(60);
    expect(res.body.pressure.reasons.join(' ')).toMatch(/No ride options/);
    expect(res.body.rides).toEqual({ count: 0, fastest: null, cheapest: null });
  });

  test('409 EVENT_ENDED once the event has finished', async () => {
    const now = new Date(Date.now() + 3 * 3600 * 1000);
    const lateToday = Date.parse(`${now.toISOString().slice(0, 10)}T23:59:30+03:00`);
    const spy = jest.spyOn(Date, 'now').mockReturnValue(lateToday);
    const res = await get('/api/rallies/rally_01/travel?from=1');
    spy.mockRestore();
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ code: 'EVENT_ENDED', message: 'This event has already ended' });
  });
});