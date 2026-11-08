import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000';

const API_HEADERS = {
  'Content-Type': 'application/json',
  'X-API-Key': 'cd4eb67fbb67b76473b4e323b3b53b573c43735a5f197b36'
};

// The API has no logins, so we remember which reviews were posted from this
// browser and only offer the Edit button on those.
const MY_REVIEWS_KEY = 'voterfs_my_review_ids';

const loadMyReviewIds = () => {
  try {
    const raw = localStorage.getItem(MY_REVIEWS_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids : [];
  } catch (err) {
    return [];
  }
};

const saveMyReviewIds = (ids) => {
  try {
    localStorage.setItem(MY_REVIEWS_KEY, JSON.stringify(ids));
  } catch (err) {
    // Storage can be blocked (private window); editing just won't persist.
  }
};

const ReviewSection = ({ candidateId }) => {
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [myReviewIds, setMyReviewIds] = useState(loadMyReviewIds);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editRating, setEditRating] = useState(0);
  const [editHover, setEditHover] = useState(0);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/candidates/${candidateId}/reviews`, {
      headers: API_HEADERS
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load reviews');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setReviews(data);
        } else {
          setReviews([]);
        }
      })
      .catch(err => {
        console.error('Failed to load reviews:', err);
        setReviews([]);
      });
  }, [candidateId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newReview.trim() || rating === 0) return;

    try {
      const res = await fetch(`${API_BASE}/api/candidates/${candidateId}/reviews`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({
          user: 'Verified User',
          rating: rating,
          text: newReview
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save review');
      }

      const savedReview = await res.json();

      // Add the server's saved copy to the top of the list
      setReviews([savedReview, ...reviews]);
      setNewReview("");
      setRating(0);

      // Remember it as ours so we can offer Edit on it
      const updatedIds = [...myReviewIds, savedReview.id];
      setMyReviewIds(updatedIds);
      saveMyReviewIds(updatedIds);
    } catch (err) {
      console.error('Failed to save review:', err);
    }
  };

  const startEdit = (rev) => {
    setEditingId(rev.id);
    setEditText(rev.text);
    setEditRating(rev.rating);
    setEditHover(0);
    setEditError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditRating(0);
    setEditHover(0);
    setEditError("");
  };

  const handleSaveEdit = async (rev) => {
    if (!editText.trim() || editRating === 0) return;

    try {
      // PUT replaces the whole review, so send the reviewer name too
      const res = await fetch(`${API_BASE}/api/candidates/${candidateId}/reviews/${rev.id}`, {
        method: 'PUT',
        headers: API_HEADERS,
        body: JSON.stringify({
          user: rev.user,
          rating: editRating,
          text: editText
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update review');
      }

      const updated = await res.json();
      setReviews(prev => prev.map(r => (r.id === updated.id ? updated : r)));
      cancelEdit();
    } catch (err) {
      console.error('Failed to update review:', err);
      setEditError('Could not save your changes. Please try again.');
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
        {reviews.length === 0 ? (
          <p className="text-muted small">No review logs recorded yet for this candidate.</p>
        ) : (
          reviews.map((rev) => (
            <div key={rev.id} className="review-card-item pb-3" style={{ borderBottom: '1px dashed #edebe9' }}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small fw-bold text-dark">{rev.user}</span>
                <span className="text-muted" style={{ fontSize: '0.78rem' }}>{rev.date}</span>
              </div>

              {editingId === rev.id ? (
                <div className="review-edit-form">
                  <div className="d-flex gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className="star-interactive"
                        data-testid={`edit-star-${star}`}
                        style={{
                          fontSize: '1.4rem',
                          cursor: 'pointer',
                          color: (editHover || editRating) >= star ? '#5B7053' : '#edebe9',
                          transition: 'color 0.1s ease'
                        }}
                        onClick={() => setEditRating(star)}
                        onMouseEnter={() => setEditHover(star)}
                        onMouseLeave={() => setEditHover(0)}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <textarea
                    className="form-control p-2 small mb-2"
                    rows="3"
                    aria-label="Edit your review"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    style={{ borderRadius: '8px', fontSize: '0.9rem', border: '1px solid #edebe9' }}
                  />
                  {editError && <p className="small mb-2" style={{ color: '#b3261e' }}>{editError}</p>}
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn text-white px-3 py-1 fw-bold small"
                      style={{ backgroundColor: '#5B7053', borderRadius: '6px', fontSize: '0.8rem' }}
                      disabled={!editText.trim() || editRating === 0}
                      onClick={() => handleSaveEdit(rev)}
                    >
                      Save changes
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-3 py-1 small"
                      style={{ borderRadius: '6px', fontSize: '0.8rem' }}
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="small mb-2" style={{ color: '#5B7053' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star}>{star <= rev.rating ? '★' : '☆'}</span>
                    ))}
                  </div>
                  <p className="text-secondary m-0 small" style={{ lineHeight: '1.5' }}>{rev.text}</p>
                  {myReviewIds.includes(rev.id) && (
                    <button
                      type="button"
                      className="btn btn-link p-0 mt-2 small"
                      style={{ color: '#5B7053', fontSize: '0.8rem', textDecoration: 'none' }}
                      onClick={() => startEdit(rev)}
                    >
                      Edit
                    </button>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewSection;