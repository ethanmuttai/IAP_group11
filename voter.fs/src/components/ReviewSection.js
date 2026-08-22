import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000';

const ReviewSection = ({ candidateId }) => {

  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  // Runs once when the page loads (and again if candidateId changes) —
  // fetches the REAL saved reviews from the server instead of starting
  // with a hardcoded array.
  useEffect(() => {
    fetch(`${API_BASE}/api/candidates/${candidateId}/reviews`)
      .then(res => res.json())
      .then(data => setReviews(data))
      .catch(err => console.error('Failed to load reviews:', err));
  }, [candidateId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newReview.trim() || rating === 0) return;

    try {
      const res = await fetch(`${API_BASE}/api/candidates/${candidateId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: 'Verified User',
          rating: rating,
          text: newReview
        })
      });

      const savedReview = await res.json();

      // Add the server's saved copy (with its real id/date) to the top of the list
      setReviews([savedReview, ...reviews]);
      setNewReview("");
      setRating(0);
    } catch (err) {
      console.error('Failed to save review:', err);
    }
  };

  return (
    <div className="review-logs-container mt-5 text-start p-4 bg-white border rounded-4 shadow-sm">
      <h4 className="fw-bold mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#1a1a1a', fontSize: '1.5rem' }}>
        Candidate Review Logs
      </h4>
      <p className="text-muted small mb-4">Log your baseline trust metrics and cross-examine manifesto stances.</p>

      <form onSubmit={handleSubmit} className="mb-4 pb-4 border-bottom">
        <label className="d-block small fw-bold text-secondary mb-2">YOUR SCORE MATRIX RATING</label>

        <div className="d-flex gap-2 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className="star-interactive"
              style={{
                fontSize: '1.8rem',
                cursor: 'pointer',
                color: (hoverRating || rating) >= star ? '#5B7053' : '#edebe9',
                transition: 'color 0.1s ease'
              }}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
            >
              ★
            </span>
          ))}
        </div>

        <div className="mb-3">
          <label className="d-block small fw-bold text-secondary mb-2">WRITE YOUR CRITICAL VERDICT</label>
          <textarea
            className="form-control p-3 small"
            rows="3"
            placeholder="Add structured thoughts on this candidate's profile matrix entry..."
            value={newReview}
            onChange={(e) => setNewReview(e.target.value)}
            style={{ borderRadius: '8px', fontSize: '0.9rem', border: '1px solid #edebe9' }}
          />
        </div>

        <button
          type="submit"
          className="btn text-white px-4 py-2 fw-bold small"
          style={{ backgroundColor: '#5B7053', borderRadius: '6px', fontSize: '0.85rem' }}
          disabled={!newReview.trim() || rating === 0}
        >
          Log Review Entry
        </button>
      </form>

      <div className="review-feed-list d-flex flex-column gap-3">
        {reviews.map((rev) => (
          <div key={rev.id} className="review-card-item pb-3" style={{ borderBottom: '1px dashed #edebe9' }}>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small fw-bold text-dark">{rev.user}</span>
              <span className="text-muted" style={{ fontSize: '0.78rem' }}>{rev.date}</span>
            </div>
            <div className="small mb-2" style={{ color: '#5B7053' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star}>{star <= rev.rating ? '★' : '☆'}</span>
              ))}
            </div>
            <p className="text-secondary m-0 small" style={{ lineHeight: '1.5' }}>{rev.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewSection;