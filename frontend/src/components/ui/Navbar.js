import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RiParkingBoxLine, RiMenuLine, RiCloseLine } from 'react-icons/ri';

const navLinks = [
  { to: '/map',     label: '🗺️ Live Map' },
  { to: '/find',    label: 'Find Parking' },
  { to: '/extract', label: 'Parse Listing' },
  { to: '/submit',  label: 'List a Space' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {/* Logo */}
        <Link to="/" style={styles.logo}>
          <RiParkingBoxLine size={22} color="var(--acid)" />
          <span style={styles.logoText}>Park<span style={styles.logoAccent}>Naija</span></span>
          <span style={styles.logoBadge}>AI</span>
        </Link>

        {/* Desktop links */}
        <div style={styles.links}>
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              style={{
                ...styles.link,
                ...(location.pathname === to ? styles.linkActive : {}),
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Auth */}
        <div style={styles.auth}>
          {user ? (
            <div style={styles.userRow}>
              <span style={styles.userName}>{user.full_name.split(' ')[0]}</span>
              {user.is_staff && (
                <Link to="/admin" style={styles.btnOutline}>Admin</Link>
              )}
              <button onClick={handleLogout} style={styles.btnOutline}>Logout</button>
            </div>
          ) : (
            <div style={styles.userRow}>
              <Link to="/login" style={styles.btnOutline}>Login</Link>
              <Link to="/register" style={styles.btnPrimary}>Sign Up</Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button style={styles.menuBtn} onClick={() => setOpen(!open)}>
          {open ? <RiCloseLine size={22} /> : <RiMenuLine size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={styles.mobileMenu}>
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} style={styles.mobileLink} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <div style={styles.mobileDivider} />
          {user ? (
            <button onClick={() => { handleLogout(); setOpen(false); }} style={styles.mobileLink}>
              Logout ({user.full_name.split(' ')[0]})
            </button>
          ) : (
            <>
              <Link to="/login"    style={styles.mobileLink} onClick={() => setOpen(false)}>Login</Link>
              <Link to="/register" style={styles.mobileLink} onClick={() => setOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

const styles = {
  nav: {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(10,10,10,0.92)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid var(--border)',
  },
  inner: {
    maxWidth: 1280, margin: '0 auto',
    padding: '0 24px', height: 60,
    display: 'flex', alignItems: 'center', gap: 32,
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 8,
    textDecoration: 'none', flexShrink: 0,
  },
  logoText: {
    fontFamily: 'var(--font-display)', fontWeight: 800,
    fontSize: '1.15rem', letterSpacing: '-0.03em', color: 'var(--text-primary)',
  },
  logoAccent: { color: 'var(--acid)' },
  logoBadge: {
    fontSize: '0.6rem', fontWeight: 700,
    background: 'var(--acid-glow)', color: 'var(--acid)',
    border: '1px solid rgba(184,242,37,0.25)',
    borderRadius: 4, padding: '1px 5px',
    letterSpacing: '0.08em',
  },
  links: {
    display: 'flex', alignItems: 'center', gap: 4, flex: 1,
  },
  link: {
    padding: '6px 14px', borderRadius: 'var(--radius-sm)',
    fontSize: '0.875rem', fontWeight: 500,
    color: 'var(--text-secondary)',
    transition: 'color var(--transition), background var(--transition)',
    textDecoration: 'none',
  },
  linkActive: {
    color: 'var(--acid)', background: 'var(--acid-glow)',
  },
  auth: { display: 'flex', alignItems: 'center', gap: 8 },
  userRow: { display: 'flex', alignItems: 'center', gap: 10 },
  userName: { fontSize: '0.85rem', color: 'var(--text-secondary)' },
  btnOutline: {
    padding: '6px 16px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text-primary)',
    fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
    textDecoration: 'none', display: 'inline-block',
    transition: 'border-color var(--transition)',
  },
  btnPrimary: {
    padding: '6px 16px', borderRadius: 'var(--radius-sm)',
    background: 'var(--acid)', color: 'var(--ink)',
    fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
    textDecoration: 'none', display: 'inline-block',
    letterSpacing: '-0.01em',
  },
  menuBtn: {
    display: 'none', background: 'none', border: 'none',
    color: 'var(--text-primary)', padding: 4,
    '@media (max-width: 768px)': { display: 'flex' },
  },
  mobileMenu: {
    display: 'flex', flexDirection: 'column',
    padding: '8px 16px 16px',
    borderTop: '1px solid var(--border)',
    background: 'var(--ink)',
  },
  mobileLink: {
    padding: '12px 8px',
    borderBottom: '1px solid var(--border-soft)',
    color: 'var(--text-primary)', textDecoration: 'none',
    fontSize: '0.95rem', background: 'none', border: 'none',
    textAlign: 'left', cursor: 'pointer',
  },
  mobileDivider: { height: 1, background: 'var(--border)', margin: '8px 0' },
};
