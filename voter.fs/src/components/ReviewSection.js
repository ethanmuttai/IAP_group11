import React, { useState } from 'react';

const ReviewSection = ({ candidateId }) => {

  const [reviews, setReviews] = useState([
    { id: 1, user: "Anonymous Voter", rating: 4, text: "Clear focus on devolution structural systems, but need more clarity on agricultural subsidy time-tables.", date: "2026-06-25" }
  ]);
  const [newReview, setNewReview] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newReview.trim() || rating === 0) return;

    const entry = {
      id: Date.now(),
      user: "Verified User",
      rating: rating,
      text: newReview,
      date: new Date().toISOString().split('T')[0]
    };

    setReviews([entry, ...reviews]);
    setNewReview("");
    setRating(0);
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