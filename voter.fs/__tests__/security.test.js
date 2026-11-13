const request = require('supertest');
const app = require('../db/server');

describe('API key', () => {
  test.each([
    ['no key', undefined],
    ['wrong key', 'not-a-real-key'],
    ['empty key', '']
  ])('401 with %s', async (_n, key) => {
    let req = request(app).get('/api/candidates');
    if (key !== undefined) req = req.set('X-API-Key', key);
    const res = await req;
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: 'UNAUTHORIZED', message: 'Missing or invalid API key' });
  });

  test('every endpoint is protected, including writes and /stats', async () => {
    const calls = [
      request(app).get('/stats'),
      request(app).get('/api/rallies'),
      request(app).get('/api/polling-stations'),
      request(app).get('/api/transport/landmarks'),
      request(app).post('/api/candidates/ruto/reviews').send({ rating: 3, text: 'x' }),
      request(app).put('/api/candidates/ruto/reviews/1').send({ rating: 3, text: 'x' }),
      request(app).post('/api/rallies/rally_01/comments').send({ comment: 'x' })
    ];
    const results = await Promise.all(calls);
    expect(results.map(r => r.status)).toEqual([401, 401, 401, 401, 401, 401, 401]);
  });

  test('the key is accepted when valid', async () => {
    const res = await request(app).get('/api/candidates').set('X-API-Key', 'test-key');
    expect(res.status).toBe(200);
  });
});

describe('rate limit', () => {
  test('429 with Retry-After after 100 requests in a minute, per key', async () => {
    const hit = () => request(app).get('/api/rallies').set('X-API-Key', 'rate-key');
    let last;
    for (let i = 0; i < 100; i++) {
      last = await hit();
      expect(last.status).toBe(200);
    }
    const res = await hit();
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ code: 'TOO_MANY_REQUESTS', message: 'Too many requests' });
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    expect(res.body.retryAfter).toBe(Number(res.headers['retry-after']));

    // a different key is not affected
    const other = await request(app).get('/api/rallies').set('X-API-Key', 'test-key');
    expect(other.status).toBe(200);
  });
});

describe('other behaviour', () => {
  test('unknown route is a contract-shaped 404', async () => {
    const res = await request(app).get('/api/nothing-here').set('X-API-Key', 'test-key');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ code: 'NOT_FOUND', message: 'Route not found' });
  });

  test('/stats reports counts and per-route numbers', async () => {
    await request(app).get('/api/candidates').set('X-API-Key', 'test-key');
    const res = await request(app).get('/stats').set('X-API-Key', 'test-key');
    expect(res.status).toBe(200);
    for (const f of ['startedAt', 'uptimeSeconds', 'total', 'clientErrors', 'serverErrors', 'errorRatePercent', 'avgMs', 'routes']) {
      expect(res.body).toHaveProperty(f);
    }
    expect(res.body.routes['GET /api/candidates']).toMatchObject({ count: expect.any(Number), avgMs: expect.any(Number) });
    expect(res.body.routes['GET /api/candidates'].count).toBeGreaterThan(0);
  });

  test('the API key is never written to the request log', async () => {
    const lines = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((l) => lines.push(String(l)));
    await request(app).get('/api/candidates').set('X-API-Key', 'test-key');
    await new Promise(r => setTimeout(r, 20));
    spy.mockRestore();
    const line = lines.find(l => l.includes('"/api/candidates"'));
    expect(line).toBeDefined();
    expect(line).not.toContain('test-key');
    expect(JSON.parse(line).caller).toMatch(/^key-[0-9a-f]{6}$/);
  });
});