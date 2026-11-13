import React, { useState, useEffect, useRef } from 'react';
import { Container, Form, Button, Table, Alert, Row, Col, Card, Badge, Spinner } from 'react-bootstrap';
import SectionHeader from '../components/SectionHeader';

const API_BASE = 'http://localhost:5000/api/transport';
const RALLIES_URL = 'http://localhost:5000/api/rallies';
const STATIONS_URL = 'http://localhost:5000/api/polling-stations';

const API_HEADERS = {
  'Content-Type': 'application/json',
  'X-API-Key': process.env.REACT_APP_API_KEY
};

// Dates arrive as plain YYYY-MM-DD strings; format them in UTC so the day never shifts.
const formatRallyDate = (isoDate) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC'
  });
};

const DetailLabel = ({ children }) => (
  <div
    className="text-uppercase fw-bold text-secondary"
    style={{ fontSize: '0.68rem', letterSpacing: '0.04em' }}
  >
    {children}
  </div>
);

const PRESSURE_STYLE = { low: 'success', medium: 'warning', high: 'danger' };

const describeRide = (ride) =>
  `${ride.providerName} ${ride.rideType}, ${ride.fare.currency} ${ride.fare.amount}, ${ride.etaMinutes} min`;

// Travel advice for one rally, from GET /api/rallies/:id/travel
const TravelAdvice = ({ advice }) => {
  const { pressure, leaveBy, rides, alternativeDropoff: alt } = advice;

  let savings = '';
  if (alt) {
    const parts = [];
    if (alt.savesFare > 0 && alt.cheapest) parts.push(`about ${alt.cheapest.fare.currency} ${alt.savesFare} cheaper`);
    if (alt.savesMinutes > 0) parts.push(`${alt.savesMinutes} min quicker`);
    savings = parts.join(' and ');
  }

  return (
    <div className="border-top pt-3 mt-3 small">
      <div className="d-flex align-items-center gap-2 mb-1">
        <DetailLabel>Crowd pressure</DetailLabel>
        <Badge
          bg={PRESSURE_STYLE[pressure.level]}
          text={pressure.level === 'medium' ? 'dark' : undefined}
          className="text-capitalize fw-normal"
        >
          {pressure.level}
        </Badge>
      </div>
      <ul className="text-muted ps-3 mb-3">
        {pressure.reasons.map((reason) => <li key={reason}>{reason}</li>)}
      </ul>

      <div className="mb-3">
        <DetailLabel>Suggested departure</DetailLabel>
        <div className="text-dark fw-bold">
          {leaveBy.leaveNow
            ? 'Leave now'
            : `Leave by ${leaveBy.time}${leaveBy.date !== advice.rally.date ? ` on ${formatRallyDate(leaveBy.date)}` : ''}`}
        </div>
        <div className="text-muted">
          Ride time {leaveBy.basedOnEtaMinutes} min, plus {leaveBy.bufferMinutes} min to arrive early.
        </div>
      </div>

      <div className="mb-3">
        <DetailLabel>Ride options ({rides.count})</DetailLabel>
        {rides.fastest && rides.cheapest ? (
          <>
            <div><span className="text-muted">Fastest: </span>{describeRide(rides.fastest)}</div>
            <div><span className="text-muted">Cheapest: </span>{describeRide(rides.cheapest)}</div>
          </>
        ) : (
          <div className="text-muted">No ride options found right now.</div>
        )}
      </div>

      {alt && (
        <div className="mb-3">
          <DetailLabel>Alternative drop-off</DetailLabel>
          <div>
            Get dropped at <strong className="text-capitalize">{alt.landmark.name}</strong> and walk
            about {alt.walkMinutes} min ({alt.distanceKm} km).
            {alt.cheapest && <> Cheapest ride there: {describeRide(alt.cheapest)}.</>}
          </div>
          {savings && <div className="text-muted">That is {savings} than going to the venue.</div>}
        </div>
      )}

      <div className="text-muted fst-italic">{advice.disclaimer}</div>
    </div>
  );
};

const PollingStationLocator = () => {
  const [landmarks, setLandmarks] = useState([]);
  const [landmarksError, setLandmarksError] = useState(false);
  const [fallbackInfo, setFallbackInfo] = useState(null); // { stale: boolean, time: string }

  const [pickupId, setPickupId] = useState('');
  const [dropoffId, setDropoffId] = useState('');
  const [rideType, setRideType] = useState('');
  const [sortBy, setSortBy] = useState('eta');

  // Our own polling stations (GET /api/polling-stations)
  const [stations, setStations] = useState([]);
  const [stationsError, setStationsError] = useState(false);
  // Which Group 10 landmark the fares were requested for (their API only knows landmarks)
  const [matchedLandmark, setMatchedLandmark] = useState(null); // { name, distanceKm, station }

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Civic events from our own /api/rallies feed (the same feed is served to Group 12)
  const [rallies, setRallies] = useState([]);
  const [ralliesLoading, setRalliesLoading] = useState(true);
  const [ralliesError, setRalliesError] = useState('');

  // Travel advice per rally: { [rallyId]: { status: 'loading' | 'done' | 'error', data, message } }
  const [travel, setTravel] = useState({});
  const pickupRef = useRef('');

  // Stations grouped by area, keeping the order the API sends them in.
  const stationAreas = [];
  stations.forEach((s) => {
    let group = stationAreas.find((g) => g.area === s.area);
    if (!group) {
      group = { area: s.area, items: [] };
      stationAreas.push(group);
    }
    group.items.push(s);
  });
  const selectedStation = stations.find((s) => s.id === dropoffId);

  // Fetch landmarks and rally events on component mount
  useEffect(() => {
    fetch(`${API_BASE}/landmarks`, {
      headers: API_HEADERS
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch landmarks');
        return res.json();
      })
      .then((resData) => {
        // Handle wrapped { data, stale, asof } or direct array
        const list = Array.isArray(resData) ? resData : (resData.data || []);
        setLandmarks(list);
        setLandmarksError(false);

        if (resData.stale) {
          const time = new Date(resData.asof).toLocaleTimeString();
          setFallbackInfo({ stale: true, time });
        } else {
          setFallbackInfo(null);
        }
      })
      .catch((err) => {
        console.error('Failed to load landmarks from proxy:', err);
        setLandmarksError(true);
      });

    fetch(STATIONS_URL, { headers: API_HEADERS })
      .then((res) => {
        if (!res.ok) throw new Error('Could not load polling stations');
        return res.json();
      })
      .then((data) => {
        setStations(Array.isArray(data) ? data : []);
        setStationsError(false);
      })
      .catch((err) => {
        console.error('Failed to load polling stations:', err);
        setStationsError(true);
      });

    // Only events that have not ended yet
    fetch(`${RALLIES_URL}?upcoming=true`, {
      headers: API_HEADERS
    })
      .then((res) => {
        if (!res.ok) throw new Error('Could not load rally data');
        return res.json();
      })
      .then((data) => {
        setRallies(Array.isArray(data) ? data : []);
        setRalliesLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load rallies:', err);
        setRalliesError('Unable to load civic events right now.');
        setRalliesLoading(false);
      });
  }, []);

  // Advice depends on where the voter starts, so clear it when their location changes.
  useEffect(() => {
    pickupRef.current = pickupId;
    setTravel({});
  }, [pickupId]);

  const loadTravel = async (rally) => {
    if (!pickupId) return;
    const requestedFrom = pickupId;
    setTravel((prev) => ({ ...prev, [rally.id]: { status: 'loading' } }));

    let result;
    try {
      const res = await fetch(
        `${RALLIES_URL}/${rally.id}/travel?from=${encodeURIComponent(requestedFrom)}`,
        { headers: API_HEADERS }
      );
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        result = { status: 'done', data: body };
      } else {
        const message =
          res.status === 409 ? 'This event has already ended.'
          : res.status === 502 ? 'Ride data is unavailable right now. Please try again shortly.'
          : (body.message || 'Could not get travel advice.');
        result = { status: 'error', message };
      }
    } catch (err) {
      result = { status: 'error', message: 'Could not reach the server. Please try again.' };
    }

    // Ignore the answer if the voter picked a different starting point meanwhile.
    if (pickupRef.current !== requestedFrom) return;
    setTravel((prev) => ({ ...prev, [rally.id]: result }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!pickupId || !dropoffId) return;

    const pickup = landmarks.find((l) => String(l.id) === String(pickupId));
    const station = stations.find((s) => s.id === dropoffId);
    if (!pickup || !station) return;

    setLoading(true);
    setSearchError('');
    setHasSearched(true);
    setMatchedLandmark(null);

    try {
      // Group 10 only understands its own landmarks, so use the one nearest to the station.
      const matchRes = await fetch(`${STATIONS_URL}/${encodeURIComponent(station.id)}/nearest-landmark`, {
        headers: API_HEADERS
      });
      if (!matchRes.ok) {
        throw new Error(
          matchRes.status === 422 ? 'Ride data does not cover that polling station area yet.'
          : matchRes.status === 502 ? 'Ride data is unavailable right now. Please try again shortly.'
          : 'Could not work out ride prices for that polling station.'
        );
      }
      const match = await matchRes.json();
      const dropoff = match.landmark;
      setMatchedLandmark({ name: dropoff.name, distanceKm: match.distanceKm, station: station.name });

      const params = new URLSearchParams({
        pickup_lat: pickup.location.lat,
        pickup_lng: pickup.location.lng,
        dropoff_lat: dropoff.location.lat,
        dropoff_lng: dropoff.location.lng,
      });

      const res = await fetch(`${API_BASE}/rides?${params.toString()}`, {
        headers: API_HEADERS
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message || 'Could not fetch ride estimates.');
      }
      let data = await res.json();

      if (rideType) {
        data = data.filter((r) =>
          r.rideType && r.rideType.toLowerCase().includes(rideType.toLowerCase())
        );
      }

      if (sortBy === 'eta') {
        data.sort((a, b) => a.etaMinutes - b.etaMinutes);
      } else if (sortBy === 'fare') {
        data.sort((a, b) => a.fare.amount - b.fare.amount);
      }

      setRides(Array.isArray(data) ? data : []);
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

      {/* Civic events (our own /api/rallies feed) */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="fw-bold mb-0 text-secondary text-uppercase small">
            Upcoming Civic Events & Rallies
          </h6>
          {!ralliesLoading && !ralliesError && rallies.length > 0 && (
            <Badge bg="light" text="dark" className="border fw-normal">
              {rallies.length} upcoming
            </Badge>
          )}
        </div>

        {ralliesLoading ? (
          <div className="p-3 bg-white border rounded-4 text-center small text-muted">
            <Spinner animation="border" size="sm" variant="success" className="me-2" />
            Loading upcoming civic events...
          </div>
        ) : ralliesError ? (
          <Alert variant="light" className="border text-muted small">{ralliesError}</Alert>
        ) : rallies.length === 0 ? (
          <div className="p-3 bg-white border rounded-4 text-center small text-muted">
            No upcoming civic events right now.
          </div>
        ) : (
          <Row className="g-2">
            {rallies.map((rally) => (
              <Col md={6} key={rally.id}>
                <Card className="border rounded-3 shadow-none bg-light h-100">
                  <Card.Body className="p-3 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <strong className="text-dark small">{rally.title}</strong>
                        <Badge bg="secondary" className="small fw-normal flex-shrink-0">
                          {rally.eventType}
                        </Badge>
                      </div>
                      <div className="small mb-2">
                        <DetailLabel>Venue</DetailLabel>
                        <span className="text-dark">{rally.venue}</span>
                      </div>
                      <div className="small">
                        <DetailLabel>Organizer</DetailLabel>
                        <span className="text-muted">{rally.organizer}</span>
                      </div>
                    </div>
                    <div className="d-flex justify-content-between gap-3 small border-top pt-2 mt-3">
                      <div>
                        <DetailLabel>Date and time</DetailLabel>
                        <span className="text-dark">
                          {formatRallyDate(rally.date)}, {rally.startTime} to {rally.endTime}
                        </span>
                      </div>
                      <div className="text-end flex-shrink-0">
                        <DetailLabel>Expected attendance</DetailLabel>
                        <span className="text-dark">{rally.expectedCrowd}</span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Button
                        variant="outline-success"
                        size="sm"
                        disabled={!pickupId || travel[rally.id]?.status === 'loading'}
                        onClick={() => loadTravel(rally)}
                      >
                        {travel[rally.id]?.status === 'loading'
                          ? 'Checking rides...'
                          : travel[rally.id]?.status === 'done'
                            ? 'Refresh'
                            : 'How do I get there?'}
                      </Button>
                      {!pickupId && (
                        <span className="small text-muted ms-2">Choose your location below first.</span>
                      )}
                    </div>

                    {travel[rally.id]?.status === 'error' && (
                      <Alert variant="light" className="border text-muted small mt-3 mb-0">
                        {travel[rally.id].message}
                      </Alert>
                    )}
                    {travel[rally.id]?.status === 'done' && (
                      <TravelAdvice advice={travel[rally.id].data} />
                    )}
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* Saved Fallback Data Banner (Part D Rubric Requirement) */}
      {fallbackInfo && fallbackInfo.stale && (
        <Alert variant="warning" className="border shadow-sm mb-4">
          ⚠️ <strong>Showing saved data from {fallbackInfo.time}.</strong> The partner is not responding.
        </Alert>
      )}

      {landmarksError && !fallbackInfo && (
        <Alert variant="warning">
          Couldn't load the landmark list from RideCompare right now. Try again shortly.
        </Alert>
      )}

      {stationsError && (
        <Alert variant="warning">
          Couldn't load the polling station list right now. Try again shortly.
        </Alert>
      )}

      <Form onSubmit={handleSearch} className="p-4 bg-white border rounded-4 shadow-sm mb-4">
        <Row className="g-3 mb-3">
          <Col md={6}>
            <Form.Label className="small fw-bold text-secondary">YOUR LOCATION</Form.Label>
            <Form.Select value={pickupId} onChange={(e) => setPickupId(e.target.value)} required>
              <option value="">Select a landmark…</option>
              {landmarks.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name ? l.name.charAt(0).toUpperCase() + l.name.slice(1) : l.id}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={6}>
            <Form.Label className="small fw-bold text-secondary">YOUR POLLING STATION</Form.Label>
            <Form.Select value={dropoffId} onChange={(e) => setDropoffId(e.target.value)} required>
              <option value="">Select a polling station…</option>
              {stationAreas.map((group) => (
                <optgroup key={group.area} label={group.area}>
                  {group.items.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </Form.Select>
            {selectedStation && !selectedStation.verified && (
              <Form.Text className="text-muted">
                Sample station, not yet checked against the IEBC register.
              </Form.Text>
            )}
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

      {hasSearched && !searchError && matchedLandmark && (
        <div className="small text-muted mb-2">
          Prices are shown to the nearest ride landmark,{' '}
          <strong className="text-capitalize">{matchedLandmark.name}</strong>
          {matchedLandmark.distanceKm > 0.5 && <> (about {matchedLandmark.distanceKm} km from {matchedLandmark.station})</>}
          , not the exact station.
        </div>
      )}

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