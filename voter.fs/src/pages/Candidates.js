import React, { useState } from 'react';
import { candidateData } from '../data/mockData';
import CandidateRowCard from '../components/CandidateRowCard';
import SectionHeader from '../components/SectionHeader';
import { Container, Form, Row, Col } from 'react-bootstrap';

const Candidates = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCandidates = candidateData.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.party.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container className="my-4 text-start">
      <SectionHeader
        category="The Repository"
        title="All candidates"
        description="4 verified profiles. Filter by office, search by name, party coalition registry, or structural profile block."
      />

      <Row className="g-3 mb-5">
        <Col md={9}>
          <Form.Control
            type="text"
            placeholder="Search candidates by name, party or county matrix..."
            className="p-3 bg-white shadow-sm border-0"
            style={{ borderRadius: "12px", fontSize: "1rem" }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Col>
        <Col md={3}>
          <Form.Select
            className="p-3 bg-white shadow-sm border-0"
            style={{ borderRadius: "12px", fontSize: "1rem", cursor: 'pointer' }}
          >
            <option value="All">⏳ All</option>
            <option value="Presidential">Presidential</option>
          </Form.Select>
        </Col>
      </Row>

      <Row className="g-4">
        {filteredCandidates.length === 0 ? (
          <Col xs={12}>
            <div className="p-5 text-center text-muted bg-white border rounded-4">
              No candidate profiles match your search criteria.
            </div>
          </Col>
        ) : (
          filteredCandidates.map((candidate, index) => (
            <Col md={6} key={candidate.id}>
              <CandidateRowCard candidate={candidate} index={index} />
            </Col>
          ))
        )}
      </Row>
    </Container>
  );
};

export default Candidates;