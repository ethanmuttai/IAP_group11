const request = require('supertest');
const app = require('../db/server');

const get = (url) => request(app).get(url).set('X-API-Key', 'test-key');

describe('GET /api/candidates', () => {
  test('returns every candidate with the contract fields and types', async () => {
    const res = await get('/api/candidates');
    expect(res.status).toBe(200);
    expect(res.body.map(c => c.id).sort()).toEqual(['kalonzo', 'maraga', 'matiangi', 'ruto']);
    for (const c of res.body) {
      for (const f of ['id', 'initials', 'name', 'party', 'description', 'experience', 'vision',
        'fiscal', 'agriculture', 'governance', 'cost_of_living']) {
        expect(typeof c[f]).toBe('string');
      }
      expect(Number.isInteger(c.review_count)).toBe(true);
    }
  });

  test('rating fields are null with 0 reviews and a number when reviewed', async () => {
    const res = await get('/api/candidates');
    const ruto = res.body.find(c => c.id === 'ruto');
    const kalonzo = res.body.find(c => c.id === 'kalonzo');
    expect(typeof ruto.average_rating).toBe('number');
    expect(ruto.review_count).toBeGreaterThan(0);
    expect(kalonzo.average_rating).toBeNull();
    expect(kalonzo.review_count).toBe(0);
  });
});

describe('GET /api/candidates/:candidateId', () => {
  test('returns one candidate', async () => {
    const res = await get('/api/candidates/ruto');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('ruto');
    expect(res.body.name).toBe('Dr. William Ruto');
    expect(Array.isArray(res.body)).toBe(false);
  });

  test('404 with { code, message } for an unknown candidate', async () => {
    const res = await get('/api/candidates/nobody');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ code: 'NOT_FOUND', message: 'Candidate not found' });
  });
});

describe('GET /api/candidates/:candidateId/reviews', () => {
  test('returns reviews for that candidate only, newest first', async () => {
    const res = await get('/api/candidates/ruto/reviews');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(5);
    for (const r of res.body) {
      expect(r.candidate_id).toBe('ruto');
      for (const f of ['id', 'user', 'text', 'date']) expect(typeof r[f]).toBe(f === 'id' ? 'number' : 'string');
      expect(Number.isInteger(r.rating)).toBe(true);
    }
    const dates = res.body.map(r => r.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  test('minRating filters out lower ratings', async () => {
    const res = await get('/api/candidates/ruto/reviews?minRating=4');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body.every(r => r.rating >= 4)).toBe(true);
  });

  test('empty list (not an error) for a candidate with no reviews', async () => {
    const res = await get('/api/candidates/kalonzo/reviews');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('minRating=5 boundary works', async () => {
    const res = await get('/api/candidates/ruto/reviews?minRating=5');
    expect(res.status).toBe(200);
    expect(res.body.every(r => r.rating === 5)).toBe(true);
  });

  test.each(['abc', '0', '6', '-1', '2.5', ''])('minRating=%p is rejected with 400', async (bad) => {
    const res = await get(`/api/candidates/ruto/reviews?minRating=${bad}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      code: 'INVALID_PARAMETER',
      message: 'minRating must be an integer between 1 and 5'
    });
  });

  test('404 for an unknown candidate', async () => {
    const res = await get('/api/candidates/nobody/reviews');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});