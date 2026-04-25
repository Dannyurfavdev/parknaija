import React, { useState } from 'react';
import { ScoreRing, AvailBadge, Button } from '../ui/UIKit';
import { reportsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import {
  RiMapPinLine, RiTimeLine, RiShieldCheckLine,
  RiCameraLine, RiCarLine, RiMoneyDollarCircleLine,
} from 'react-icons/ri';

export default function ParkingCard({ space, rank }) {
  const [reporting, setReporting] = useState(false);

  const handleReport = async (status) => {
    setReporting(true);
    try {
      await reportsAPI.submit({ space: space.id, status });
      toast.success(`Reported as "${status}" — thanks for helping!`);
    } catch {
      toast.error('Could not submit report. Try again.');
    } finally {
      setReporting(false);
    }
  };

  const rankColors = ['#b8f225', '#888', '#666'];
  const rankLabels = ['Best Match', '2nd Choice', '3rd Option'];

  return (
    <div style={styles.card} className="animate-fade-up">
      {/* Rank stripe */}
      <div style={{ ...styles.rankStripe, background: rankColors[rank] || '#444' }}>
        <span style={styles.rankLabel}>{rankLabels[rank] || `#${rank + 1}`}</span>
      </div>

      <div style={styles.body}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.nameRow}>
              <h3 style={styles.name}>{space.name}</h3>
              {space.features?.is_verified && (
                <span className="badge badge-acid">✓ Verified</span>
              )}
            </div>
            <div style={styles.addressRow}>
              <RiMapPinLine size={13} color="var(--text-muted)" />
              <span style={styles.address}>{space.address}</span>
            </div>
          </div>
          <ScoreRing score={space.parking_score} size={58} />
        </div>

        {/* Stats row */}
        <div style={styles.stats}>
          <Stat icon={<RiMoneyDollarCircleLine size={15} />}
            label="Per Hour"
            value={`₦${Number(space.price_per_hour).toLocaleString()}`}
            sub={space.price_is_negotiable ? 'negotiable' : null}
          />
          {space.distance_km != null && (
            <Stat icon={<RiMapPinLine size={15} />}
              label="Distance"
              value={`${space.distance_km} km`}
            />
          )}
          <Stat icon={<RiCarLine size={15} />}
            label="Capacity"
            value={`${space.capacity} car${space.capacity !== 1 ? 's' : ''}`}
          />
          <Stat icon={<RiTimeLine size={15} />}
            label="Availability"
            value={<AvailBadge level={space.availability} />}
          />
        </div>

        {/* Features row */}
        {(space.features?.has_security || space.features?.has_cctv || space.features?.is_covered) && (
          <div style={styles.features}>
            {space.features.has_security && <Feature icon={<RiShieldCheckLine size={12} />} label="Security" />}
            {space.features.has_cctv     && <Feature icon={<RiCameraLine size={12} />}      label="CCTV" />}
            {space.features.is_covered   && <Feature icon="🏠" label="Covered" small />}
          </div>
        )}

        {/* Score reasoning */}
        <p style={styles.reason}>{space.why_recommended}</p>

        {/* Hours */}
        {(space.available_from || space.available_until) && (
          <p style={styles.hours}>
            <RiTimeLine size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {space.available_from || '?'} – {space.available_until || '?'}
          </p>
        )}

        {/* Estimated total */}
        {space.estimated_total_cost && (
          <div style={styles.totalBanner}>
            <span style={styles.totalLabel}>Estimated Total</span>
            <span style={styles.totalValue}>₦{Number(space.estimated_total_cost).toLocaleString()}</span>
          </div>
        )}

        {/* Report buttons */}
        <div style={styles.reportRow}>
          <span style={styles.reportLabel}>Update status:</span>
          <Button size="sm" variant="ghost"
            onClick={() => handleReport('available')} loading={reporting}>
            ✅ Available
          </Button>
          <Button size="sm" variant="ghost"
            onClick={() => handleReport('full')} loading={reporting}>
            🔴 Full
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub }) {
  return (
    <div style={statStyles.wrap}>
      <div style={statStyles.iconRow}>{icon}<span style={statStyles.label}>{label}</span></div>
      <div style={statStyles.value}>{value}</div>
      {sub && <div style={statStyles.sub}>{sub}</div>}
    </div>
  );
}

function Feature({ icon, label }) {
  return (
    <span style={featureStyles.chip}>
      {typeof icon === 'string' ? <span style={{ fontSize: 10 }}>{icon}</span> : icon}
      {label}
    </span>
  );
}

const styles = {
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    transition: 'border-color 200ms, box-shadow 200ms',
  },
  rankStripe: {
    padding: '4px 16px',
    display: 'flex', alignItems: 'center',
  },
  rankLabel: {
    fontSize: '0.68rem', fontWeight: 800,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: 'var(--ink)',
  },
  body: { padding: '20px 20px 16px' },
  header: { display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 },
  nameRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  name: {
    fontFamily: 'var(--font-display)', fontSize: '1.05rem',
    fontWeight: 700, color: 'var(--text-primary)',
  },
  addressRow: { display: 'flex', alignItems: 'center', gap: 5 },
  address: { fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 },
  stats: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: 12, marginBottom: 14,
    padding: '14px', borderRadius: 'var(--radius-md)',
    background: 'var(--ink-soft)', border: '1px solid var(--border-soft)',
  },
  features: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  reason: {
    fontSize: '0.82rem', color: 'var(--text-secondary)',
    lineHeight: 1.5, marginBottom: 10,
    paddingLeft: 10, borderLeft: '2px solid var(--acid-dim)',
  },
  hours: { fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 },
  totalBanner: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'var(--acid-glow)', border: '1px solid rgba(184,242,37,0.15)',
    borderRadius: 'var(--radius-sm)', padding: '8px 14px', marginBottom: 14,
  },
  totalLabel: { fontSize: '0.78rem', color: 'var(--acid)', fontWeight: 600, letterSpacing: '0.02em' },
  totalValue: { fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--acid)', fontSize: '1.1rem' },
  reportRow: {
    display: 'flex', alignItems: 'center', gap: 4,
    paddingTop: 12, borderTop: '1px solid var(--border-soft)',
  },
  reportLabel: { fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: 4 },
};

const statStyles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 3 },
  iconRow: { display: 'flex', alignItems: 'center', gap: 4 },
  label: { fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  value: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' },
  sub: { fontSize: '0.7rem', color: 'var(--acid)', fontStyle: 'italic' },
};

const featureStyles = {
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 8px', borderRadius: 'var(--radius-pill)',
    background: 'var(--ink-muted)', border: '1px solid var(--border)',
    fontSize: '0.72rem', color: 'var(--text-secondary)',
  },
};
