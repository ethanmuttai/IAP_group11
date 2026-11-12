// Run with: npm run test:api
// Pins what v1 callers (e.g. Group 12) depend on, and checks the v2 shape.
process.env.API_KEYS = 'test-key';
const request = require('supertest');
const app = require('./server');

const get = (url) => request(app).get(url).set('X-API-Key', 'test-key');

describe('v1 contract is unchanged (old URLs keep working)', () => {
  test('GET /api/candidates is still a bare array with the same fields', async () => {
    const res = await get('/api/candidates');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    for (const field of ['id', 'name', 'party', 'average_rating', 'review_count']) {
      expect(res.body[0]).toHaveProperty(field);
    }
  });

  test('/api/v1/candidates is the same as /api/candidates', async () => {
    const a = await get('/api/candidates');
    const b = await get('/api/v1/candidates');
    expect(b.body).toEqual(a.body);
  });

  test('v1 list responses carry Deprecation, Sunset and Link headers', async () => {
    const res = await get('/api/candidates');
    expect(res.headers.deprecation).toBe('true');
    expect(res.headers.sunset).toBe('Fri, 13 Nov 2026 00:00:00 GMT');
    expect(res.headers.link).toBe('</api/v2/candidates>; rel="successor-version"');
  });

  test('v1 single-object responses are not deprecated (shape is identical in v2)', async () => {
    const res = await get('/api/candidates/ruto');
    expect(res.status).toBe(200);
    expect(res.headers.deprecation).toBeUndefined();
    expect(res.body).toHaveProperty('id', 'ruto');
  });
});

describe('v2 wraps lists as { data, count }', () => {
  test.each([
    '/api/v2/candidates',
    '/api/v2/candidates/ruto/reviews',
    '/api/v2/rallies',
    '/api/v2/rallies/rally_01/comments',
    '/api/v2/polling-stations'
  ])('GET %s', async (url) => {
    const res = await get(url);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBe(res.body.data.length);
  });

  test('v2 data matches v1 data, only the wrapper differs', async () => {
    const v1 = await get('/api/candidates');
    const v2 = await get('/api/v2/candidates');
    expect(v2.body.data).toEqual(v1.body);
  });

  test('v2 responses have no deprecation headers', async () => {
    const res = await get('/api/v2/candidates');
    expect(res.headers.deprecation).toBeUndefined();
    expect(res.headers.sunset).toBeUndefined();
  });

  test('v2 single object is unchanged', async () => {
    const res = await get('/api/v2/candidates/ruto');
    expect(res.body).toHaveProperty('id', 'ruto');
    expect(res.body).not.toHaveProperty('data');
  });

  test('v2 errors keep the { code, message } shape', async () => {
    const res = await get('/api/v2/candidates/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ code: 'NOT_FOUND', message: 'Candidate not found' });
  });
});

describe('everything else is untouched', () => {
  test('/api/v3/... is a normal 404', async () => {
    const res = await get('/api/v3/candidates');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  test('/stats has no deprecation headers and lists the version in route labels', async () => {
    await get('/api/v2/candidates');
    const res = await get('/stats');
    expect(res.headers.deprecation).toBeUndefined();
    expect(Object.keys(res.body.routes)).toContain('GET /api/v2/candidates');
  });

  test('missing API key is still 401', async () => {
    const res = await request(app).get('/api/v2/candidates');
    expect(res.status).toBe(401);
  });
});