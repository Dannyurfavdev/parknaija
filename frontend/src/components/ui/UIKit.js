import React from 'react';

// ── Button ────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', loading, style, ...props }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-body)', fontWeight: 600,
    transition: 'all var(--transition)',
    letterSpacing: '-0.01em', borderRadius: 'var(--radius-sm)',
    opacity: loading ? 0.7 : 1,
  };

  const sizes = {
    sm: { padding: '6px 14px', fontSize: '0.82rem' },
    md: { padding: '10px 20px', fontSize: '0.9rem' },
    lg: { padding: '13px 28px', fontSize: '1rem' },
  };

  const variants = {
    primary: { background: 'var(--acid)', color: 'var(--ink)' },
    outline: { background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)' },
    ghost:   { background: 'transparent', color: 'var(--text-secondary)', border: 'none' },
    danger:  { background: 'rgba(248,113,113,0.1)', color: 'var(--red)', border: '1px solid rgba(248,113,113,0.2)' },
  };

  return (
    <button style={{ ...base, ...sizes[size], ...variants[variant], ...style }} disabled={loading} {...props}>
      {loading && <span className="spinner" style={{ width: 14, height: 14 }} />}
      {children}
    </button>
  );
}

// ── Card ─────────────────────────────────────────────────────
export function Card({ children, style, hover, ...props }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        transition: hover ? 'border-color var(--transition), box-shadow var(--transition)' : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────
export function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: '0.72rem', fontWeight: 700,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      color: 'var(--acid)', marginBottom: 6,
    }}>
      {children}
    </p>
  );
}

// ── Score Ring ─────────────────────────────────────────────────
export function ScoreRing({ score, size = 64 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? 'var(--green)' : score >= 45 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="var(--border)" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 800,
        fontSize: size * 0.22, color,
      }}>
        {score}
      </div>
    </div>
  );
}

// ── Availability Badge ─────────────────────────────────────────
export function AvailBadge({ level }) {
  const cls = `badge avail-${level.toLowerCase()}`;
  const dot = level === 'High' ? '●' : level === 'Medium' ? '◐' : '○';
  return <span className={cls}>{dot} {level}</span>;
}

// ── Empty State ────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{
      textAlign: 'center', padding: 'var(--space-16) var(--space-6)',
      color: 'var(--text-muted)',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.5 }}>{icon}</div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem',
        color: 'var(--text-secondary)', marginBottom: 6 }}>{title}</p>
      {subtitle && <p style={{ fontSize: '0.875rem' }}>{subtitle}</p>}
    </div>
  );
}

// ── Full-page Loader ───────────────────────────────────────────
export function PageLoader() {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</p>
      </div>
    </div>
  );
}

// ── Form Field ─────────────────────────────────────────────────
export function Field({ label, hint, error, children, required }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontSize: '0.82rem', fontWeight: 600,
          color: 'var(--text-secondary)', letterSpacing: '0.01em',
        }}>
          {label}{required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{hint}</p>}
      {error && <p style={{ fontSize: '0.78rem', color: 'var(--red)' }}>{error}</p>}
    </div>
  );
}
