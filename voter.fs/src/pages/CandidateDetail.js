import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Table, Button } from 'react-bootstrap';
import { candidateData } from '../data/mockData';
import ReviewSection from '../components/ReviewSection';

const CandidateDetail = () => {
  const { id } = useParams();

  const candidate = candidateData.find(c => String(c.id) === String(id));

  if (!candidate) {
    return (
      <Container className="py-5 text-center" style={{ marginTop: '5rem' }}>
        <h4 className="fw-bold text-dark">Candidate Profile Not Found</h4>
        <p className="text-muted">We couldn't find a profile matching "{id}".</p>
        <Link to="/">
          <Button variant="dark" className="mt-3 px-4">Back to Dashboard</Button>
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-5 text-start" style={{ maxWidth: '900px', marginTop: '2rem' }}>
      <Link to="/" className="text-decoration-none text-muted small d-inline-flex align-items-center gap-2 mb-4">
        ← Back to home
      </Link>

      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
          style={{ width: '70px', height: '70px', backgroundColor: '#5B7053', fontSize: '1.4rem' }}
        >
          {candidate.initials || "C"}
        </div>
        <div>
          <h2 className="fw-bold m-0" style={{ fontFamily: 'Playfair Display, serif' }}>{candidate.name}</h2>
          <div className="text-muted small d-flex align-items-center gap-2 mt-1">
            <span>{candidate.party || "Independent"}</span>
            <span>•</span>
            <span style={{ color: '#5B7053', fontWeight: '600' }}>
              ✓ Verified Profile
            </span>
          </div>
        </div>
      </div>

      <p className="lead text-secondary mb-5" style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
        {candidate.description || "No description available for this candidate."}
      </p>

      <h4 className="fw-bold mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>Manifesto Pillars & Stances</h4>
      <Table responsive bordered hover className="bg-white mb-5">
        <thead>
          <tr className="bg-light">
            <th style={{ width: '30%' }} className="small fw-bold text-secondary">PILLAR</th>
            <th className="small fw-bold text-secondary">PROPOSED STRATEGY</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="fw-bold small text-dark">Experience & Track Record</td>
            <td className="small text-secondary">{candidate.experience || "No information available."}</td>
          </tr>
          <tr>
            <td className="fw-bold small text-dark">Core Vision Statement</td>
            <td className="small text-secondary">{candidate.vision || "No information available."}</td>
          </tr>
          <tr>
            <td className="fw-bold small text-dark">Taxation & Fiscal Policy</td>
            <td className="small text-secondary">{candidate.fiscal || "No information available."}</td>
          </tr>
          <tr>
            <td className="fw-bold small text-dark">Agriculture & Food Security</td>
            <td className="small text-secondary">{candidate.agriculture || "No information available."}</td>
          </tr>
          <tr>
            <td className="fw-bold small text-dark">Governance & Devolution</td>
            <td className="small text-secondary">{candidate.governance || "No information available."}</td>
          </tr>
          <tr>
            <td className="fw-bold small text-dark">Cost of Living Mitigation</td>
            <td className="small text-secondary">{candidate.costOfLiving || "No information available."}</td>
          </tr>
        </tbody>
      </Table>

      <ReviewSection candidateId={candidate.id} />
    </Container>
  );
};

export default CandidateDetail;