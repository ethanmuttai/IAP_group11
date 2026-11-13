const request = require('supertest');
const app = require('../db/server');

const api = {
  get: (url) => request(app).get(url).set('X-API-Key', 'test-key'),
  post: (url, body) => request(app).post(url).set('X-API-Key', 'test-key').send(body),
  put: (url, body) => request(app).put(url).set('X-API-Key', 'test-key').send(body)
};

describe('POST /api/candidates/:candidateId/reviews', () => {
  test('creates a review and returns it with 201', async () => {
    const res = await api.post('/api/candidates/kalonzo/reviews', { user: '  Wanjiru  ', rating: 4, text: '  Clear plan.  ' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ candidate_id: 'kalonzo', user: 'Wanjiru', rating: 4, text: 'Clear plan.' });
    expect(Number.isInteger(res.body.id)).toBe(true);
    expect(res.body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('the new review shows up in GET and changes the candidate rating', async () => {
    const before = (await api.get('/api/candidates/maraga')).body;
    expect(before.review_count).toBe(0);
    const created = await api.post('/api/candidates/maraga/reviews', { rating: 5, text: 'Fair.' });
    const list = await api.get('/api/candidates/maraga/reviews');
    expect(list.body.map(r => r.id)).toContain(created.body.id);
    const after = (await api.get('/api/candidates/maraga')).body;
    expect(after.review_count).toBe(1);
    expect(after.average_rating).toBe(5);
  });

  test('user is optional and defaults to Anonymous Voter', async () => {
    const res = await api.post('/api/candidates/matiangi/reviews', { rating: 3, text: 'Okay.' });
    expect(res.status).toBe(201);
    expect(res.body.user).toBe('Anonymous Voter');
  });

  test('boundary ratings 1 and 5 are accepted', async () => {
    expect((await api.post('/api/candidates/matiangi/reviews', { rating: 1, text: 'a' })).status).toBe(201);
    expect((await api.post('/api/candidates/matiangi/reviews', { rating: 5, text: 'b' })).status).toBe(201);
  });

  test.each([
    ['rating missing', { text: 'x' }, 'rating and text are required'],
    ['text missing', { rating: 3 }, 'rating and text are required'],
    ['rating 0', { rating: 0, text: 'x' }, 'rating must be an integer between 1 and 5'],
    ['rating 6', { rating: 6, text: 'x' }, 'rating must be an integer between 1 and 5'],
    ['rating 3.5', { rating: 3.5, text: 'x' }, 'rating must be an integer between 1 and 5'],
    ['rating as a string', { rating: '4', text: 'x' }, 'rating must be an integer between 1 and 5'],
    ['blank text', { rating: 3, text: '   ' }, 'text must be a non-empty string'],
    ['text not a string', { rating: 3, text: 42 }, 'text must be a non-empty string'],
    ['user not a string', { rating: 3, text: 'x', user: 7 }, 'user must be a string']
  ])('400 INVALID_REVIEW when %s', async (_name, body, message) => {
    const res = await api.post('/api/candidates/ruto/reviews', body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ code: 'INVALID_REVIEW', message });
  });

  test('400 on a body that is not valid JSON', async () => {
    const res = await request(app).post('/api/candidates/ruto/reviews')
      .set('X-API-Key', 'test-key').set('Content-Type', 'application/json').send('{not json');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_REVIEW');
  });

  test('404 for an unknown candidate', async () => {
    const res = await api.post('/api/candidates/nobody/reviews', { rating: 3, text: 'x' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ code: 'NOT_FOUND', message: 'Candidate not found' });
  });

  test('a rejected review is not saved', async () => {
    const before = (await api.get('/api/candidates/ruto/reviews')).body.length;
    await api.post('/api/candidates/ruto/reviews', { rating: 9, text: 'x' });
    const after = (await api.get('/api/candidates/ruto/reviews')).body.length;
    expect(after).toBe(before);
  });
});

describe('PUT /api/candidates/:candidateId/reviews/:reviewId', () => {
  test('replaces the review and keeps its id, candidate and date', async () => {
    const created = (await api.post('/api/candidates/kalonzo/reviews', { user: 'A', rating: 2, text: 'old' })).body;
    const res = await api.put(`/api/candidates/kalonzo/reviews/${created.id}`, { user: 'B', rating: 5, text: 'new' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...created, user: 'B', rating: 5, text: 'new' });
  });

  test('is idempotent: sending the same PUT twice gives the same result', async () => {
    const created = (await api.post('/api/candidates/kalonzo/reviews', { rating: 2, text: 'old' })).body;
    const body = { user: 'C', rating: 4, text: 'same' };
    const first = await api.put(`/api/candidates/kalonzo/reviews/${created.id}`, body);
    const second = await api.put(`/api/candidates/kalonzo/reviews/${created.id}`, body);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  });

  test('the edit is visible in the list and does not add a review', async () => {
    const created = (await api.post('/api/candidates/maraga/reviews', { rating: 2, text: 'old' })).body;
    const countBefore = (await api.get('/api/candidates/maraga/reviews')).body.length;
    await api.put(`/api/candidates/maraga/reviews/${created.id}`, { rating: 3, text: 'edited' });
    const list = (await api.get('/api/candidates/maraga/reviews')).body;
    expect(list.length).toBe(countBefore);
    expect(list.find(r => r.id === created.id).text).toBe('edited');
  });

  test('user defaults to Anonymous Voter when omitted', async () => {
    const created = (await api.post('/api/candidates/kalonzo/reviews', { user: 'Named', rating: 2, text: 'x' })).body;
    const res = await api.put(`/api/candidates/kalonzo/reviews/${created.id}`, { rating: 3, text: 'y' });
    expect(res.body.user).toBe('Anonymous Voter');
  });

  test.each([
    ['rating missing', { text: 'x' }, 'rating and text are required'],
    ['rating 0', { rating: 0, text: 'x' }, 'rating must be an integer between 1 and 5'],
    ['rating 6', { rating: 6, text: 'x' }, 'rating must be an integer between 1 and 5'],
    ['blank text', { rating: 3, text: ' ' }, 'text must be a non-empty string'],
    ['user not a string', { rating: 3, text: 'x', user: false }, 'user must be a string']
  ])('400 INVALID_REVIEW when %s, and the review is unchanged', async (_name, body, message) => {
    const created = (await api.post('/api/candidates/kalonzo/reviews', { rating: 2, text: 'keep' })).body;
    const res = await api.put(`/api/candidates/kalonzo/reviews/${created.id}`, body);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ code: 'INVALID_REVIEW', message });
    const list = (await api.get('/api/candidates/kalonzo/reviews')).body;
    expect(list.find(r => r.id === created.id).text).toBe('keep');
  });

  test('404 Candidate not found', async () => {
    const res = await api.put('/api/candidates/nobody/reviews/1', { rating: 3, text: 'x' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ code: 'NOT_FOUND', message: 'Candidate not found' });
  });

  test.each(['999999', 'abc', '1.5'])('404 Review not found for id %s', async (id) => {
    const res = await api.put(`/api/candidates/ruto/reviews/${id}`, { rating: 3, text: 'x' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ code: 'NOT_FOUND', message: 'Review not found' });
  });

  test("404 when the review belongs to a different candidate", async () => {
    // review id 1 belongs to ruto
    const res = await api.put('/api/candidates/kalonzo/reviews/1', { rating: 3, text: 'x' });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Review not found');
  });
});