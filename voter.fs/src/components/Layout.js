import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { BsShieldCheck } from 'react-icons/bs';
import { Container } from 'react-bootstrap';
import Slider from './Slider';

const Layout = () => {
  const location = useLocation();

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      <div style={{ backgroundColor: '#5B7053', overflow: 'hidden', width: '100%' }}>
        <Slider />
      </div>

      <nav className="custom-navbar bg-white" style={{ borderBottom: '1px solid #edebe9' }}>
        <Container className="d-flex justify-content-between align-items-center" style={{ height: '70px' }}>

          <Link to="/" className="nav-brand-text d-flex align-items-center gap-2 text-decoration-none text-dark">
            <div className="brand-shield-logo" style={{ color: '#5B7053' }}>
              <BsShieldCheck size={26} />
            </div>
            <span style={{
              fontSize: '1.45rem',
              fontWeight: '900',
              letterSpacing: '-0.3px',
              fontFamily: 'Playfair Display, serif'
            }}>
              VoterEdu<span style={{ color: '#5B7053', fontWeight: '900' }}>.</span>
            </span>
          </Link>

          <div className="d-flex gap-4">
            <Link to="/" className="fw-bold text-decoration-none" style={{ color: location.pathname === '/' ? '#5B7053' : '#1a1a1a' }}>Home</Link>
            <Link to="/candidates" className="fw-bold text-decoration-none" style={{ color: location.pathname === '/candidates' ? '#5B7053' : '#1a1a1a' }}>Candidates</Link>
            <Link to="/compare" className="fw-bold text-decoration-none" style={{ color: location.pathname === '/compare' ? '#5B7053' : '#1a1a1a' }}>Compare</Link>
            <Link to="/polling-station" className="fw-bold text-decoration-none" style={{ color: location.pathname === '/polling-station' ? '#5B7053' : '#1a1a1a' }}>Get There</Link>
          </div>
        </Container>
      </nav>

      <main style={{ flex: '1 0 auto', backgroundColor: '#ffffff' }}>
        <Outlet />
      </main>

      <footer style={{
        backgroundColor: '#f7f5f2',
        borderTop: '1px solid #edebe9',
        padding: '2rem 0 1.5rem 0',
        marginTop: '4rem',
        width: '100%'
      }}>
        <Container className="d-flex justify-content-between align-items-center">
          <div className="text-start">
            <div className="fw-bold mb-1" style={{ fontSize: '1rem', color: '#1a1a1a' }}>VoterEdu Kenya</div>
            <p className="text-muted small m-0">Independent, verified facts. No government or party involvement.</p>
          </div>

          <div className="d-flex align-items-center" style={{ gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '20px', height: '10px', borderRadius: '2px', backgroundColor: '#000000' }}></span>
            <span style={{ display: 'inline-block', width: '20px', height: '10px', borderRadius: '2px', backgroundColor: '#990000' }}></span>
            <span style={{ display: 'inline-block', width: '20px', height: '10px', borderRadius: '2px', backgroundColor: '#ffffff', border: '1px solid #cccccc' }}></span>
            <span style={{ display: 'inline-block', width: '20px', height: '10px', borderRadius: '2px', backgroundColor: '#006600' }}></span>

            <span className="text-muted small ms-2">© 2026</span>
          </div>
        </Container>
      </footer>
    </div>
  );
};

export default Layout;