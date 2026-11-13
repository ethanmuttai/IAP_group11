const request = require('supertest');
const app = require('../db/server');

const api = {
  get: (url) => request(app).get(url).set('X-API-Key', 'test-key'),
  post: (url, body) => request(app).post(url).set('X-API-Key', 'test-key').send(body)
};

describe('GET /api/rallies', () => {
  test('returns the rally feed with the contract fields', async () => {
    const res = await api.get('/api/rallies');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(14);
    for (const r of res.body) {
      for (const f of ['id', 'title', 'organizer', 'candidate', 'party', 'venue', 'date', 'startTime', 'endTime', 'expectedCrowd', 'eventType']) {
        expect(typeof r[f]).toBe('string');
      }
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.startTime).toMatch(/^\d{2}:\d{2}$/);
      expect(typeof r.location.lat).toBe('number');
      expect(typeof r.location.lng).toBe('number');
    }
    expect(new Set(res.body.map(r => r.id)).size).toBe(14);
  });

  test('upcoming=false returns everything', async () => {
    const all = await api.get('/api/rallies');
    const res = await api.get('/api/rallies?upcoming=false');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(all.body.length);
  });

  test('upcoming=true returns only events that have not ended', async () => {
    const all = (await api.get('/api/rallies')).body;
    const res = await api.get('/api/rallies?upcoming=true');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(all.length);
    expect(res.body.length).toBeGreaterThan(0);
    const now = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
    const today = now.slice(0, 10);
    const time = now.slice(11, 16);
    for (const r of res.body) {
      expect(r.date > today || (r.date === today && r.endTime > time)).toBe(true);
    }
  });

  test.each(['maybe', '1', 'TRUE', ''])('upcoming=%p is rejected with 400', async (bad) => {
    const res = await api.get(`/api/rallies?upcoming=${bad}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ code: 'INVALID_PARAMETER', message: 'upcoming must be true or false' });
  });
});

describe('rally comments', () => {
  test('GET returns an empty list for a rally with no comments', async () => {
    const res = await api.get('/api/rallies/rally_05/comments');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('POST creates a comment with 201 and the saved fields', async () => {
    const res = await api.post('/api/rallies/rally_01/comments', {
      user: ' Amina ', comment: ' Ramps at the east gate. ', accessible: true, congestion_level: 'Low'
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      rally_id: 'rally_01', user: 'Amina', comment: 'Ramps at the east gate.', accessible: 1, congestion_level: 'Low'
    });
    expect(Number.isInteger(res.body.id)).toBe(true);
    expect(res.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('defaults: Anonymous Attendee, accessible 1, congestion Medium', async () => {
    const res = await api.post('/api/rallies/rally_02/comments', { comment: 'Busy.' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ user: 'Anonymous Attendee', accessible: 1, congestion_level: 'Medium' });
  });

  test('accessible false is stored as 0', async () => {
    const res = await api.post('/api/rallies/rally_02/comments', { comment: 'No ramp.', accessible: false });
    expect(res.body.accessible).toBe(0);
  });

  test('an unknown congestion_level falls back to Medium', async () => {
    const res = await api.post('/api/rallies/rally_02/comments', { comment: 'Hm.', congestion_level: 'Huge' });
    expect(res.status).toBe(201);
    expect(res.body.congestion_level).toBe('Medium');
  });

  test('GET lists saved comments for that rally only, newest first', async () => {
    await api.post('/api/rallies/rally_03/comments', { comment: 'first' });
    await api.post('/api/rallies/rally_03/comments', { comment: 'second' });
    await api.post('/api/rallies/rally_04/comments', { comment: 'other rally' });
    const res = await api.get('/api/rallies/rally_03/comments');
    expect(res.status).toBe(200);
    expect(res.body.map(c => c.comment)).toEqual(['second', 'first']);
    expect(res.body.every(c => c.rally_id === 'rally_03')).toBe(true);
  });

  test.each([
    ['missing', {}],
    ['blank', { comment: '   ' }],
    ['not a string', { comment: 12 }],
    ['null', { comment: null }]
  ])('400 INVALID_INPUT when comment is %s', async (_n, body) => {
    const res = await api.post('/api/rallies/rally_01/comments', body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ code: 'INVALID_INPUT', message: 'comment is required' });
  });
});