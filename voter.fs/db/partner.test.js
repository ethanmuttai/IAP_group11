// Run with: npm run test:api
// Checks how we read Group 10's landmarks, v1 and v2, and that a shape we do
// not recognise fails LOUDLY instead of quietly showing an empty list.
const http = require('http');
process.env.API_KEYS = 'test-key';

const { parseLandmarks, landmarksPath } = require('./partner');

const SAMPLE = [{ id: '1', name: 'cbd', location: { lat: -1.2864, lng: 36.8172 } }];

describe('parseLandmarks', () => {
  test('v1 accepts a bare array', () => {
    expect(parseLandmarks(SAMPLE, 'v1')).toEqual(SAMPLE);
  });
  test('v2 accepts { data, count }', () => {
    expect(parseLandmarks({ data: SAMPLE, count: 1 }, 'v2')).toEqual(SAMPLE);
  });
  test('v2 throws on a bare array (the shape-mismatch case)', () => {
    expect(() => parseLandmarks(SAMPLE, 'v2')).toThrow('unexpected v2 shape');
  });
  test('v2 throws on junk', () => {
    expect(() => parseLandmarks(null, 'v2')).toThrow('unexpected v2 shape');
    expect(() => parseLandmarks({ data: 'x' }, 'v2')).toThrow('unexpected v2 shape');
  });
  test('v1 throws on a wrapped body', () => {
    expect(() => parseLandmarks({ data: SAMPLE }, 'v1')).toThrow('unexpected v1 shape');
  });
  test('paths', () => {
    expect(landmarksPath('v1')).toBe('/landmarks');
    expect(landmarksPath('v2')).toBe('/v2/landmarks');
  });
});

describe('GET /api/transport/landmarks against a mock Group 10', () => {
  const request = require('supertest');
  let mock;
  let v2Body;
  const seen = [];

  beforeAll((done) => {
    mock = http.createServer((req, res) => {
      seen.push(req.url);
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/v2/landmarks') return res.end(JSON.stringify(v2Body));
      if (req.url === '/landmarks') return res.end(JSON.stringify(SAMPLE));
      res.statusCode = 404;
      res.end('{}');
    });
    mock.listen(0, () => {
      process.env.PARTNER_URL = `http://localhost:${mock.address().port}`;
      process.env.PARTNER_VERSION = 'v2';
      done();
    });
  });
  afterAll(() => new Promise((resolve) => {
    mock.closeAllConnections();
    mock.close(() => resolve());
  }));

  test('v2: calls /v2/landmarks and returns fresh data (stale: false)', async () => {
    v2Body = { data: SAMPLE, count: 1 };
    const app = require('./server');
    const res = await request(app).get('/api/transport/landmarks').set('X-API-Key', 'test-key');
    expect(seen).toContain('/v2/landmarks');
    expect(res.status).toBe(200);
    expect(res.body.stale).toBe(false);
    expect(res.body.data).toEqual(SAMPLE);
  });

  test('wrong shape is logged as a failure and the cached copy is marked stale', async () => {
    v2Body = SAMPLE; // partner sends the OLD shape on the v2 path
    const app = require('./server');
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app).get('/api/transport/landmarks').set('X-API-Key', 'test-key');
    expect(errors.mock.calls.flat().join(' ')).toContain('unexpected v2 shape');
    expect(res.body.stale).toBe(true);
    errors.mockRestore();
  });

  test('PARTNER_VERSION=v1 rolls back to /landmarks', async () => {
    process.env.PARTNER_VERSION = 'v1';
    seen.length = 0;
    const app = require('./server');
    const res = await request(app).get('/api/transport/landmarks').set('X-API-Key', 'test-key');
    expect(seen).toEqual(['/landmarks']);
    expect(res.body.stale).toBe(false);
    process.env.PARTNER_VERSION = 'v2';
  });
});