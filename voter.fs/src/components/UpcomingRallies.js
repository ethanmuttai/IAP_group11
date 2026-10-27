import React, { useState, useEffect } from 'react';
import { Card, Badge, Spinner, Alert, Row, Col } from 'react-bootstrap';

const UpcomingRallies = () => {
  const [rallies, setRallies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/rallies')
      .then((res) => {
        if (!res.ok) throw new Error('Could not load rally alerts.');
        return res.json();
      })
      .then((data) => {
        setRallies(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch rallies:', err);
        setError('Unable to fetch live event and rally updates.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" variant="success" size="sm" />
        <span className="ms-2 small text-muted">Checking nearby civic events...</span>
      </div>
    );
  }

  if (error) {
    return <Alert variant="light" className="border text-muted small">{error}</Alert>;
  }

  return (
    <div className="my-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0" style={{ color: '#2C3E2D' }}>
          Upcoming Civic Events & Traffic Alerts
        </h5>
        <Badge bg="secondary" pill className="fw-normal">
          Downstream Feed (Group 12)
        </Badge>
      </div>

      <Row className="g-3">
        {rallies.map((rally) => {
          const isRestricted = rally.accessibilityStatus === 'Restricted';
          return (
            <Col md={12} key={rally.id}>
              <Card className="border rounded-4 shadow-sm h-100">
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="fw-bold mb-1 text-dark">{rally.title}</h6>
                      <div className="small text-muted">
                        <strong>Venue:</strong> {rally.venue} | <strong>Organizer:</strong> {rally.organizer}
                      </div>
                    </div>
                    <Badge bg={isRestricted ? 'danger' : 'warning'} className="text-uppercase px-2 py-1">
                      {rally.accessibilityStatus}
                    </Badge>
                  </div>

                  <div className="d-flex gap-3 small text-secondary my-2">
                    <span>📅 {rally.date}</span>
                    <span>⏰ {rally.startTime} - {rally.endTime}</span>
                    <span>👥 {rally.expectedCrowd}</span>
                  </div>

                  <div className="small p-2 rounded bg-light border text-secondary">
                    ⚠️ <strong>Impact:</strong> {rally.trafficImpact}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default UpcomingRallies;