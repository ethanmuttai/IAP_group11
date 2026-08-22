import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Form } from 'react-bootstrap';
import CandidateRowCard from '../components/CandidateRowCard';

const API_BASE = 'http://localhost:5000';

const Home = () => {
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState('');
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/candidates`)
      .then(res => res.json())
      .then(data => setCandidates(data))
      .catch(err => console.error('Failed to load candidates:', err));
  }, []);

  const featured = candidates.slice(0, 4);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate('/candidates');
  };

  return (
    <Container className="py-5 text-start">
      
      {/* Hero Header Area */}
      <div className="mb-5 pt-2">
        {/* Kenyan National Colors Dot Badge Grid */}
        <div className="d-flex align-items-center gap-2 mb-3">
          <div className="d-flex gap-1">
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#000000' }}></span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#990000' }}></span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#006600' }}></span>
          </div>
          <span className="text-uppercase fw-bold tracking-wider text-muted" style={{ fontSize: '0.75rem', letterSpacing: '1.5px' }}>
            Independent • Non-biased • Facts-based
          </span>
        </div>

        {/* Clean Title Headline */}
        <h1 className="display-3 fw-black mb-3" style={{ fontFamily: 'Playfair Display, serif', fontWeight: '900', color: '#1a1a1a', letterSpacing: '-1px' }}>
          Vote based on facts, not noise.
        </h1>

        {/* Sub-description */}
        <p className="text-secondary mb-4" style={{ fontSize: '1.2rem', maxWidth: '650px', lineHeight: '1.6' }}>
          VoterEdu is a verified, Wikipedia-style repository of Kenyan political candidates — their manifestos, records, and stances, all in one place.
        </p>

        {/* Search Input Button/frame */}
        <Form onSubmit={handleSearchSubmit} className="mb-2" style={{ maxWidth: '680px' }}>
          <div className="p-2 bg-white border rounded-4 shadow-sm d-flex align-items-center justify-content-between" style={{ borderRadius: '14px' }}>
            <div className="d-flex align-items-center flex-grow-1 px-2 gap-2">
              <span className="text-muted" style={{ fontSize: '1.1rem' }}>🔍</span>
              <Form.Control 
                type="text"
                placeholder="Search candidates, parties or counties..."
                className="border-0 shadow-none p-2 bg-transparent"
                style={{ fontSize: '1.05rem' }}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>
            <Button 
              type="submit"
              className="border-0 text-white px-4 py-2 fw-bold"
              style={{ backgroundColor: '#5B7053', borderRadius: '8px', fontSize: '0.95rem' }}
            >
              Browse all →
            </Button>
          </div>
        </Form>
        <p className="text-muted small ms-2 mb-4">Try: "David Maraga"</p>

        {/* Action button tracks */}
        <div className="d-flex gap-3 mb-5">
          <Link to="/candidates" className="text-decoration-none">
            <Button className="border-0 text-white px-4 py-2.5 fw-bold" style={{ backgroundColor: '#111111', borderRadius: '8px' }}>
              Browse candidates
            </Button>
          </Link>
          <Link to="/compare" className="text-decoration-none">
            <Button variant="outline-dark" className="px-4 py-2.5 fw-bold" style={{ borderRadius: '8px', border: '1px solid #cccccc' }}>
              Compare side-by-side
            </Button>
          </Link>
        </div>
      </div>

      {/* Feature Pillars Grid */}
      <div className="bg-white border rounded-4 p-4 mb-5 shadow-sm">
        <Row className="g-4">
          <Col md={4}>
            <h5 className="fw-bold mb-2" style={{ color: '#5B7053', fontFamily: 'Playfair Display, serif', fontSize: '1.3rem' }}>
              ✓ Verified, not viral
            </h5>
            <p className="text-muted small m-0">
              Every claim is sourced, cross-checked, and reviewed before it ever maps onto an entry matrix.
            </p>
          </Col>
          <Col md={4} className="border-start-md">
            <h5 className="fw-bold mb-2" style={{ color: '#5B7053', fontFamily: 'Playfair Display, serif', fontSize: '1.3rem' }}>
              ⚖ Truly independent
            </h5>
            <p className="text-muted small m-0">
              No government ties, no party alignments, and zero candidate financial sponsorship tracking channels.
            </p>
          </Col>
          <Col md={4} className="border-start-md">
            <h5 className="fw-bold mb-2" style={{ color: '#5B7053', fontFamily: 'Playfair Display, serif', fontSize: '1.3rem' }}>
              ✓ Manifestos that matter
            </h5>
            <p className="text-muted small m-0">
              Read structural breakdowns, track performance criteria, and analyze time-series metrics smoothly.
            </p>
          </Col>
        </Row>
      </div>

      {/* Featured Header Titles Grid */}
      <div className="mb-4 pt-2 d-flex justify-content-between align-items-end">
        <div>
          <span className="text-uppercase fw-bold tracking-wider mb-1 d-block" style={{ color: '#8B1E1E', fontSize: '0.78rem', letterSpacing: '1px' }}>
            Featured Profiles
          </span>
          <h2 className="display-5 fw-black m-0" style={{ fontFamily: 'Playfair Display, serif', fontWeight: '900', color: '#1a1a1a' }}>
            Know who's on the ballot.
          </h2>
        </div>
        <Link to="/candidates" className="text-decoration-none fw-bold small pb-1" style={{ color: '#8B1E1E' }}>
          View all →
        </Link>
      </div>

      {/* Candidate Data Feed List */}
      <div className="d-flex flex-column gap-3">
        {featured.map((candidate, index) => (
          <CandidateRowCard key={candidate.id} candidate={candidate} index={index} />
        ))}
      </div>
    </Container>
  );
};

export default Home;