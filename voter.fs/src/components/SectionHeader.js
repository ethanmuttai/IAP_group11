import React from 'react';

const SectionHeader = ({ category, title, description }) => {
  return (
    <div className="text-start mb-5 pt-4">
      {category && (
        <span
          className="small fw-bold text-uppercase"
          style={{ color: '#d50000', letterSpacing: '0.1em', fontSize: '0.8rem' }}
        >
          • {category}
        </span>
      )}
      <h1
        className="fw-bold mt-1 mb-3"
        style={{ fontSize: '3rem', fontFamily: 'Oxygen, sans-serif', letterSpacing: '-0.03em' }}
      >
        {title}
      </h1>
      {description && (
        <p className="text-muted m-0" style={{ fontSize: '1.1rem', maxWidth: '700px', lineHeight: '1.5' }}>
          {description}
        </p>
      )}
    </div>
  );
};

export default SectionHeader;