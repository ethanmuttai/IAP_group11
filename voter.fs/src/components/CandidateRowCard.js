import React from 'react';
import { Link } from 'react-router-dom';

const CandidateRowCard = ({ candidate, index }) => {

  const thematicColors = ['#5B7053', '#8B1E1E', '#2E4A62', '#D9A74A'];
  const currentTheme = thematicColors[index % thematicColors.length];

  // average_rating comes from the server now (real average of that
  // candidate's reviews). If there are no reviews yet, it'll be null,
  // so we fall back to 0 and show all empty stars.
  const rating = candidate.average_rating ?? 0;
  const reviewCount = candidate.review_count ?? 0;

  return (
    <Link to={`/candidates/${candidate.id}`} className="text-decoration-none text-dark">
      <div className="p-4 bg-white border rounded-4 shadow-sm mb-3 candidate-card-hover" style={{ cursor: 'pointer' }}>
        <div className="d-flex justify-content-between align-items-start">
          <div className="d-flex gap-3">

            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
              style={{
                width: '50px',
                height: '50px',
                backgroundColor: currentTheme,
                fontSize: '1.2rem',
                flexShrink: 0
              }}
            >
              {candidate.initials || candidate.name.charAt(0)}
            </div>

            <div>
              <h5 className="fw-bold m-0" style={{ fontFamily: 'Playfair Display, serif', color: currentTheme }}>
                {candidate.name}
              </h5>
              <p className="text-muted small mb-2">{candidate.party || "Presidential Candidate"}</p>
              <p className="text-secondary small m-0" style={{ maxWidth: '600px', lineHeight: '1.5' }}>
                {candidate.description}
              </p>
            </div>
          </div>

          <div className="text-end">
            <div className="d-flex align-items-center gap-1 mb-1" style={{ color: currentTheme }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={star <= Math.round(rating) ? '' : 'text-muted'}>★</span>
              ))}
            </div>
            <small className="text-muted d-block">
              {reviewCount > 0 ? `${rating.toFixed(1)} Rating` : 'No ratings yet'}
            </small>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CandidateRowCard;