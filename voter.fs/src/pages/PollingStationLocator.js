import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Table, Alert, Row, Col } from 'react-bootstrap';
import SectionHeader from '../components/SectionHeader';

// TODO: swap this for RideCompare's real base URL once Group 10 confirms it —
// their openapi.yaml doesn't include a `servers` block, so this is a guess
// (their own server presumably runs on a different port than ours, 5000).
const RIDECOMPARE_BASE = 'http://localhost:5001';

const PollingStationLocator = () => {
  const [landmarks, setLandmarks] = useState([]);
  const [landmarksError, setLandmarksError] = useState(false);

  const [pickupId, setPickupId] = useState('');
  const [dropoffId, setDropoffId] = useState('');
  const [rideType, setRideType] = useState('');
  const [sortBy, setSortBy] = useState('eta');

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Load the landmark list once on mount — this is what lets a voter pick
  // "Uhuru Park" instead of typing raw lat/lng coordinates.
  useEffect(() => {
    fetch(`${RIDECOMPARE_BASE}/landmarks`)
      .then((res) => res.json())
      .then((data) => setLandmarks(data))
      .catch((err) => {
        console.error('Failed to load landmarks from RideCompare:', err);
        setLandmarksError(true);
      });
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!pickupId || !dropoffId) return;

    const pickup = landmarks.find((l) => l.id === pickupId);
    const dropoff = landmarks.find((l) => l.id === dropoffId);
    if (!pickup || !dropoff) return;

    setLoading(true);
    setSearchError('');
    setHasSearched(true);

    const params = new URLSearchParams({
      pickup_lat: pickup.location.lat,
      pickup_lng: pickup.location.lng,
      dropoff_lat: dropoff.location.lat,
      dropoff_lng: dropoff.location.lng,
    });
    if (rideType) params.append('type', rideType);
    if (sortBy) params.append('sort', sortBy);

    try {
      const res = await fetch(`${RIDECOMPARE_BASE}/rides?${params.toString()}`);
      if (!res.ok) {
        // RideCompare's 400 responses carry { code, message } per their contract
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message || 'Could not fetch ride estimates.');
      }
      const data = await res.json();
      setRides(data);
    } catch (err) {
      console.error('Failed to fetch ride estimates:', err);
      setSearchError(err.message);
      setRides([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5 text-start" style={{ maxWidth: '900px' }}>
      <SectionHeader
        category="Get There"
        title="Polling station locator"
        description="Pick your location and your polling station to compare ride fares and ETAs before you leave home."
      />

      {landmarksError && (
        <Alert variant="warning">
          Couldn't load the landmark list from RideCompare right now. Try again shortly.
        </Alert>
      )}

      <Form onSubmit={handleSearch} className="p-4 bg-white border rounded-4 shadow-sm mb-4">
        <Row className="g-3 mb-3">
          <Col md={6}>
            <Form.Label className="small fw-bold text-secondary">YOUR LOCATION</Form.Label>
            <Form.Select value={pickupId} onChange={(e) => setPickupId(e.target.value)} required>
              <option value="">Select a landmark…</option>
              {landmarks.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={6}>
            <Form.Label className="small fw-bold text-secondary">YOUR POLLING STATION</Form.Label>
            <Form.Select value={dropoffId} onChange={(e) => setDropoffId(e.target.value)} required>
              <option value="">Select a landmark…</option>
              {landmarks.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Form.Select>
          </Col>
        </Row>

        <Row className="g-3 mb-3">
          <Col md={6}>
            <Form.Label className="small fw-bold text-secondary">RIDE TYPE</Form.Label>
            <Form.Select value={rideType} onChange={(e) => setRideType(e.target.value)}>
              <option value="">All types</option>
              <option value="Boda">Boda (budget-friendly)</option>
              <option value="Standard">Standard</option>
              <option value="XL">XL</option>
            </Form.Select>
          </Col>
          <Col md={6}>
            <Form.Label className="small fw-bold text-secondary">SORT BY</Form.Label>
            <Form.Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="eta">Fastest first (won't miss poll closing)</option>
              <option value="fare">Cheapest first</option>
            </Form.Select>
          </Col>
        </Row>

        <Button
          type="submit"
          className="border-0 text-white px-4 py-2 fw-bold"
          style={{ backgroundColor: '#5B7053', borderRadius: '8px' }}
          disabled={!pickupId || !dropoffId || loading}
        >
          {loading ? 'Comparing…' : 'Compare rides'}
        </Button>
      </Form>

      {searchError && <Alert variant="danger">{searchError}</Alert>}

      {hasSearched && !searchError && (
        rides.length === 0 ? (
          <div className="p-4 text-center text-muted bg-white border rounded-4">
            No ride estimates found for that route.
          </div>
        ) : (
          <Table responsive bordered hover className="bg-white">
            <thead>
              <tr className="bg-light">
                <th className="small fw-bold text-secondary">Provider</th>
                <th className="small fw-bold text-secondary">Type</th>
                <th className="small fw-bold text-secondary">Fare</th>
                <th className="small fw-bold text-secondary">ETA</th>
                <th className="small fw-bold text-secondary">Capacity</th>
              </tr>
            </thead>
            <tbody>
              {rides.map((r) => (
                <tr key={r.id}>
                  <td className="small">{r.providerName}</td>
                  <td className="small">{r.rideType}</td>
                  <td className="small">{r.fare.currency} {r.fare.amount.toFixed(0)}</td>
                  <td className="small">{r.etaMinutes} min</td>
                  <td className="small">{r.capacity} seats</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )
      )}
    </Container>
  );
};

export default PollingStationLocator;