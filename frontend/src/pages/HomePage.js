import React from 'react';
import { Link } from 'react-router-dom';
import { RiArrowRightLine, RiMapPinLine, RiRobot2Line, RiWhatsappLine, RiFlashlightLine } from 'react-icons/ri';

const CITIES = [
  { name: 'Lagos', tag: 'Island · Mainland · VI', emoji: '🌊' },
  { name: 'Port Harcourt', tag: 'GRA · Rumuola · D-Line', emoji: '⚡' },
  { name: 'Abuja', tag: 'CBD · Wuse 2 · Maitama', emoji: '🏛️' },
];

const FEATURES = [
  {
    icon: <RiRobot2Line size={22} />,
    title: 'AI-Powered Recommendations',
    desc: 'Get top 3 parking options scored for distance, price, and availability — in seconds.',
  },
  {
    icon: <RiWhatsappLine size={22} />,
    title: 'WhatsApp Listing Parser',
    desc: 'Paste any informal parking message and our AI turns it into a structured listing instantly.',
  },
  {
    icon: <RiFlashlightLine size={22} />,
    title: 'Real-Time Availability Intel',
    desc: 'Predict parking difficulty using time-of-day, area type, and city patterns before you drive.',
  },
  {
    icon: <RiMapPinLine size={22} />,
    title: 'Community Reports',
    desc: 'Drivers update space status live — full, available, or gone. Like Waze, for parking.',
  },
];

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.heroGlow} />
        <div className="container" style={styles.heroInner}>
          <div style={styles.heroBadge}>
            <span style={styles.heroBadgeDot} />
            Now live in 3 cities
          </div>

          <h1 style={styles.heroTitle}>
            Stop Circling.<br />
            <span style={styles.heroAccent}>Park Smarter.</span>
          </h1>

          <p style={styles.heroSub}>
            Park Naija AI finds parking in Lagos, Port Harcourt, and Abuja —
            using real-world patterns, community data, and AI that understands Nigerian cities.
          </p>

          <div style={styles.heroCtas}>
            <Link to="/find" style={styles.ctaPrimary}>
              Find Parking Now <RiArrowRightLine size={18} />
            </Link>
            <Link to="/submit" style={styles.ctaSecondary}>
              List Your Space
            </Link>
          </div>

          {/* City pills */}
          <div style={styles.cityRow}>
            {CITIES.map(c => (
              <div key={c.name} style={styles.cityPill}>
                <span>{c.emoji}</span>
                <div>
                  <div style={styles.cityName}>{c.name}</div>
                  <div style={styles.cityTag}>{c.tag}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section style={styles.statsStrip}>
        <div className="container" style={styles.statsInner}>
          {[
            { val: '3', label: 'Cities' },
            { val: 'AI', label: 'Powered Scoring' },
            { val: '0–100', label: 'Parking Score' },
            { val: 'Live', label: 'Community Reports' },
          ].map(s => (
            <div key={s.label} style={styles.stat}>
              <span style={styles.statVal}>{s.val}</span>
              <span style={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={styles.features}>
        <div className="container">
          <p style={styles.sectionEyebrow}>How it works</p>
          <h2 style={styles.sectionTitle}>Built for how Nigerians actually park</h2>
          <div style={styles.featureGrid} className="stagger">
            {FEATURES.map((f, i) => (
              <div key={i} style={styles.featureCard} className="animate-fade-up">
                <div style={styles.featureIcon}>{f.icon}</div>
                <h3 style={styles.featureTitle}>{f.title}</h3>
                <p style={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Extract CTA */}
      <section style={styles.extractCta}>
        <div className="container-sm" style={{ textAlign: 'center' }}>
          <p style={styles.sectionEyebrow}>New feature</p>
          <h2 style={styles.sectionTitle}>Got a parking message on WhatsApp?</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 32px', fontSize: '0.95rem' }}>
            Paste it. Our AI extracts location, price, capacity, and hours — and turns it into a real listing.
          </p>
          <div style={styles.extractDemo}>
            <p style={styles.demoMsg}>
              "you can park in my compound at rumuola junction, 3 cars, 1500 per hour, available till 9pm, gateman dey there"
            </p>
            <div style={styles.demoArrow}>↓ AI Extracts</div>
            <div style={styles.demoOutput}>
              <Row k="Location" v="Rumuola Junction" />
              <Row k="Capacity" v="3 cars" />
              <Row k="Price" v="₦1,500 / hr" />
              <Row k="Until" v="21:00" />
              <Row k="Security" v="Yes (gateman)" />
            </div>
          </div>
          <Link to="/extract" style={{ ...styles.ctaPrimary, display: 'inline-flex', marginTop: 24 }}>
            Try It Free <RiArrowRightLine size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div className="container" style={styles.footerInner}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            © 2024 Park Naija AI — Reducing parking chaos in Nigerian cities.
          </span>
          <div style={styles.footerLinks}>
            <Link to="/find"   style={styles.footerLink}>Find Parking</Link>
            <Link to="/submit" style={styles.footerLink}>List a Space</Link>
            <Link to="/extract" style={styles.footerLink}>Parse Listing</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0',
      borderBottom: '1px solid var(--border-soft)' }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{k}</span>
      <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>{v}</span>
    </div>
  );
}

const styles = {
  hero: {
    position: 'relative', overflow: 'hidden',
    padding: '80px 0 72px', minHeight: '75vh',
    display: 'flex', alignItems: 'center',
  },
  heroGlow: {
    position: 'absolute', top: '-120px', left: '50%',
    transform: 'translateX(-50%)',
    width: '600px', height: '400px',
    background: 'radial-gradient(ellipse, rgba(184,242,37,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  heroInner: { position: 'relative', zIndex: 1 },
  heroBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '5px 14px', borderRadius: 'var(--radius-pill)',
    background: 'var(--acid-glow)', border: '1px solid rgba(184,242,37,0.2)',
    fontSize: '0.78rem', fontWeight: 600, color: 'var(--acid)',
    letterSpacing: '0.04em', marginBottom: 24,
  },
  heroBadgeDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: 'var(--acid)', animation: 'pulse-acid 2s infinite',
  },
  heroTitle: {
    fontFamily: 'var(--font-display)', fontSize: 'clamp(2.4rem, 6vw, 4.2rem)',
    fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.04em',
    color: 'var(--text-primary)', marginBottom: 20,
  },
  heroAccent: { color: 'var(--acid)' },
  heroSub: {
    fontSize: 'clamp(0.95rem, 2vw, 1.1rem)', color: 'var(--text-secondary)',
    maxWidth: 520, lineHeight: 1.65, marginBottom: 36,
  },
  heroCtas: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 },
  ctaPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '13px 26px', borderRadius: 'var(--radius-sm)',
    background: 'var(--acid)', color: 'var(--ink)',
    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem',
    textDecoration: 'none', letterSpacing: '-0.01em',
    transition: 'opacity var(--transition)',
  },
  ctaSecondary: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '13px 26px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'transparent',
    color: 'var(--text-primary)', fontFamily: 'var(--font-display)',
    fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
  },
  cityRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  cityPill: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 16px', borderRadius: 'var(--radius-md)',
    background: 'var(--surface)', border: '1px solid var(--border)',
  },
  cityName: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.88rem' },
  cityTag: { fontSize: '0.72rem', color: 'var(--text-muted)' },
  statsStrip: {
    borderTop: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
    padding: '20px 0',
  },
  statsInner: { display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  statVal: {
    fontFamily: 'var(--font-display)', fontSize: '1.6rem',
    fontWeight: 800, color: 'var(--acid)',
  },
  statLabel: { fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.04em' },
  features: { padding: '80px 0' },
  sectionEyebrow: {
    fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--acid)', marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
    fontWeight: 800, letterSpacing: '-0.03em',
    color: 'var(--text-primary)', marginBottom: 48,
  },
  featureGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 20,
  },
  featureCard: {
    padding: 24, borderRadius: 'var(--radius-lg)',
    background: 'var(--surface)', border: '1px solid var(--border)',
  },
  featureIcon: {
    width: 42, height: 42, borderRadius: 10,
    background: 'var(--acid-glow)', border: '1px solid rgba(184,242,37,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--acid)', marginBottom: 16,
  },
  featureTitle: {
    fontFamily: 'var(--font-display)', fontSize: '1rem',
    fontWeight: 700, marginBottom: 8,
  },
  featureDesc: { fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 },
  extractCta: {
    padding: '80px 0',
    background: 'var(--surface)',
    borderTop: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
  },
  extractDemo: {
    maxWidth: 440, margin: '0 auto',
    background: 'var(--ink)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
  },
  demoMsg: {
    padding: 20, fontSize: '0.85rem', color: 'var(--text-secondary)',
    lineHeight: 1.6, borderBottom: '1px solid var(--border)',
    fontStyle: 'italic',
  },
  demoArrow: {
    textAlign: 'center', padding: '10px',
    fontSize: '0.75rem', color: 'var(--acid)',
    fontWeight: 700, letterSpacing: '0.04em',
    background: 'var(--acid-glow)',
  },
  demoOutput: { padding: '8px 20px 16px' },
  footer: {
    borderTop: '1px solid var(--border)',
    padding: '24px 0',
  },
  footerInner: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', flexWrap: 'wrap', gap: 16,
  },
  footerLinks: { display: 'flex', gap: 20 },
  footerLink: { fontSize: '0.82rem', color: 'var(--text-muted)' },
};
