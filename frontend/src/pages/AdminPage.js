import React, { useState, useEffect, useCallback } from 'react';
import { listingsAPI } from '../services/api';
import api from '../services/api';
import { Button, SectionLabel, ScoreRing, AvailBadge } from '../components/ui/UIKit';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiCheckLine, RiCloseLine, RiMapPinLine, RiTimeLine,
  RiCarLine, RiMoneyDollarCircleLine, RiUserLine,
  RiShieldCheckLine, RiRefreshLine, RiEyeLine,
} from 'react-icons/ri';

const STATUS_TABS = [
  { value: 'pending',  label: 'Pending Review', color: '#fbbf24' },
  { value: 'active',   label: 'Active',          color: '#4ade80' },
  { value: 'inactive', label: 'Inactive',         color: '#f87171' },
];

const CITIES = ['all', 'lagos', 'port_harcourt', 'abuja'];

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [spaces, setSpaces]   = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState('pending');
  const [city, setCity]       = useState('all');
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchSpaces = useCallback(async () => {
    setLoading(true);
    try {
      const params = { status };
      if (city !== 'all') params.city = city;
      const { data } = await api.get('/listings/', { params: { ...params, page_size: 50 } });
      setSpaces(data.results || data || []);
    } catch {
      toast.error('Failed to load spaces');
    } finally {
      setLoading(false);
    }
  }, [status, city]);

  const fetchStats = useCallback(async () => {
    try {
      const [pending, active, inactive] = await Promise.all([
        api.get('/listings/', { params: { status: 'pending',  page_size: 1 } }),
        api.get('/listings/', { params: { status: 'active',   page_size: 1 } }),
        api.get('/listings/', { params: { status: 'inactive', page_size: 1 } }),
      ]);
      setStats({
        pending:  pending.data.count  || (pending.data.results  || pending.data).length,
        active:   active.data.count   || (active.data.results   || active.data).length,
        inactive: inactive.data.count || (inactive.data.results || inactive.data).length,
      });
    } catch {}
  }, []);

  useEffect(() => { fetchSpaces(); }, [fetchSpaces]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleAction = async (spaceId, action) => {
    setActionLoading(spaceId + action);
    try {
      const updates = {
        approve:    { status: 'active',   is_verified: true  },
        reject:     { status: 'inactive', is_verified: false },
        deactivate: { status: 'inactive' },
        activate:   { status: 'active'  },
      };
      await listingsAPI.update(spaceId, updates[action]);

      const labels = {
        approve: 'approved', reject: 'rejected',
        deactivate: 'deactivated', activate: 'activated',
      };
      toast.success(`Space ${labels[action] || action} successfully`);

      // Clear selected immediately so detail panel closes
      setSelected(null);

      // Remove the space from list immediately (optimistic update)
      // so user sees instant feedback without waiting for re-fetch
      setSpaces(prev => prev.filter(s => s.id !== spaceId));

      // Then re-fetch in background to get accurate server state
      setTimeout(() => {
        fetchSpaces();
        fetchStats();
      }, 300);

    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.status?.[0] || 'Action failed';
      toast.error(detail);
    } finally {
      setActionLoading(null);
    }
  };

  // Redirect non-admins — AFTER all hooks
  if (!authLoading && (!user || !user.is_staff)) {
    return <Navigate to="/" />;
  }

  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <SectionLabel>Admin Panel</SectionLabel>
          <h1 style={styles.title}>Park Naija AI Dashboard</h1>
        </div>
        <button onClick={() => { fetchSpaces(); fetchStats(); }} style={styles.refreshBtn}>
          <RiRefreshLine size={15} />
          Refresh
        </button>
      </div>

      {/* ── Stats Cards ── */}
      {stats && (
        <div style={styles.statsGrid}>
          <StatCard label="Pending Review" value={stats.pending}  color="#fbbf24" icon="⏳" />
          <StatCard label="Active Spaces"  value={stats.active}   color="#4ade80" icon="✅" />
          <StatCard label="Inactive"       value={stats.inactive} color="#f87171" icon="❌" />
          <StatCard label="Total"
            value={(stats.pending || 0) + (stats.active || 0) + (stats.inactive || 0)}
            color="#b8f225" icon="🅿️" />
        </div>
      )}

      <div style={styles.layout}>
        {/* ── Left: filters + list ── */}
        <div style={styles.listPanel}>
          {/* Filter bar */}
          <div style={styles.filters}>
            <div style={styles.statusTabs}>
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => { setStatus(tab.value); setSelected(null); }}
                  style={{
                    ...styles.statusTab,
                    ...(status === tab.value ? { borderBottom: `2px solid ${tab.color}`, color: tab.color } : {}),
                  }}
                >
                  {tab.label}
                  {stats && (
                    <span style={{ ...styles.tabBadge, background: `${tab.color}20`, color: tab.color }}>
                      {stats[tab.value] || 0}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div style={styles.cityFilter}>
              {CITIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCity(c)}
                  style={{ ...styles.cityChip, ...(city === c ? styles.cityChipActive : {}) }}
                >
                  {c === 'all' ? 'All Cities' : c.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div style={styles.list}>
            {loading && (
              <div style={styles.loadingState}>
                <div className="spinner" />
                <span>Loading spaces...</span>
              </div>
            )}

            {!loading && spaces.length === 0 && (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🅿️</div>
                <p style={styles.emptyTitle}>No {status} spaces</p>
                <p style={styles.emptySub}>
                  {status === 'pending'
                    ? 'All submissions have been reviewed.'
                    : 'No spaces in this category.'}
                </p>
              </div>
            )}

            {spaces.map(space => (
              <SpaceRow
                key={space.id}
                space={space}
                isSelected={selected?.id === space.id}
                onClick={() => setSelected(s => s?.id === space.id ? null : space)}
                onApprove={() => handleAction(space.id, 'approve')}
                onReject={() => handleAction(space.id, 'reject')}
                actionLoading={actionLoading}
                status={status}
              />
            ))}
          </div>
        </div>

        {/* ── Right: detail panel ── */}
        <div style={styles.detailPanel}>
          {!selected ? (
            <div style={styles.detailEmpty}>
              <RiEyeLine size={32} color="var(--text-muted)" style={{ opacity: 0.4 }} />
              <p style={styles.detailEmptyText}>Select a space to review</p>
            </div>
          ) : (
            <SpaceDetail
              space={selected}
              status={status}
              actionLoading={actionLoading}
              onApprove={() => handleAction(selected.id, 'approve')}
              onReject={() => handleAction(selected.id, 'reject')}
              onActivate={() => handleAction(selected.id, 'activate')}
              onDeactivate={() => handleAction(selected.id, 'deactivate')}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Space row in list ──────────────────────────────────────────
function SpaceRow({ space, isSelected, onClick, onApprove, onReject, actionLoading, status }) {
  const isLoading = actionLoading?.startsWith(String(space.id));
  return (
    <div
      onClick={onClick}
      style={{ ...styles.spaceRow, ...(isSelected ? styles.spaceRowActive : {}) }}
    >
      <div style={styles.spaceRowLeft}>
        <div style={styles.spaceRowTop}>
          <p style={styles.spaceName}>{space.name}</p>
          {space.is_verified && <span style={styles.verifiedBadge}>✓ Verified</span>}
        </div>
        <p style={styles.spaceCity}>{space.city?.replace('_', ' ')} · {space.area_type}</p>
        <p style={styles.spaceAddr}>{space.address?.slice(0, 55)}{space.address?.length > 55 ? '…' : ''}</p>
        <div style={styles.spaceMetaRow}>
          <span style={styles.spaceMeta}>₦{Number(space.price_per_hour).toLocaleString()}/hr</span>
          <span style={styles.spaceMeta}>{space.capacity} cars</span>
          <span style={{ ...styles.sourceBadge, color: space.source === 'extracted' ? '#60a5fa' : 'var(--text-muted)' }}>
            {space.source}
          </span>
        </div>
      </div>

      {/* Quick actions for pending */}
      {status === 'pending' && (
        <div style={styles.quickActions} onClick={e => e.stopPropagation()}>
          <button
            onClick={onApprove}
            disabled={!!isLoading}
            style={{ ...styles.quickBtn, ...styles.quickApprove }}
          >
            <RiCheckLine size={14} />
          </button>
          <button
            onClick={onReject}
            disabled={!!isLoading}
            style={{ ...styles.quickBtn, ...styles.quickReject }}
          >
            <RiCloseLine size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Full detail panel ──────────────────────────────────────────
function SpaceDetail({ space, status, actionLoading, onApprove, onReject, onActivate, onDeactivate }) {
  const isLoading = (act) => actionLoading === String(space.id) + act;

  return (
    <div style={styles.detail}>
      {/* Title */}
      <div style={styles.detailTop}>
        <div>
          <SectionLabel>Space Detail</SectionLabel>
          <h2 style={styles.detailTitle}>{space.name}</h2>
          <p style={styles.detailSub}>{space.address}</p>
        </div>
        <div style={styles.detailBadges}>
          <span style={{
            ...styles.statusDot,
            background: status === 'active' ? '#4ade8033' : status === 'pending' ? '#fbbf2433' : '#f8717133',
            color: status === 'active' ? '#4ade80' : status === 'pending' ? '#fbbf24' : '#f87171',
          }}>
            {status}
          </span>
          {space.source && <span style={styles.sourceTag}>{space.source}</span>}
        </div>
      </div>

      {/* Info grid */}
      <div style={styles.infoGrid}>
        <InfoItem icon={<RiMapPinLine size={14} />}   label="City"      value={space.city?.replace('_', ' ')} />
        <InfoItem icon={<RiCarLine size={14} />}       label="Area Type" value={space.area_type} />
        <InfoItem icon={<RiMoneyDollarCircleLine size={14} />} label="Price/hr" value={`₦${Number(space.price_per_hour).toLocaleString()}${space.price_is_negotiable ? ' (neg.)' : ''}`} />
        <InfoItem icon={<RiCarLine size={14} />}       label="Capacity"  value={`${space.capacity} car${space.capacity !== 1 ? 's' : ''}`} />
        <InfoItem icon={<RiTimeLine size={14} />}      label="Hours"     value={space.available_from && space.available_until ? `${space.available_from} – ${space.available_until}` : 'Not set'} />
        <InfoItem icon={<RiUserLine size={14} />}      label="Submitted" value={space.submitted_by_name || 'Admin'} />
      </div>

      {/* Days */}
      {space.available_days?.length > 0 && (
        <div style={styles.infoSection}>
          <p style={styles.infoSectionLabel}>Available Days</p>
          <div style={styles.daysRow}>
            {['mon','tue','wed','thu','fri','sat','sun'].map(d => {
              const full = { mon:'monday',tue:'tuesday',wed:'wednesday',thu:'thursday',fri:'friday',sat:'saturday',sun:'sunday' }[d];
              const active = space.available_days.includes(full);
              return (
                <span key={d} style={{ ...styles.dayDot, ...(active ? styles.dayDotActive : {}) }}>
                  {d.toUpperCase()}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Features */}
      <div style={styles.infoSection}>
        <p style={styles.infoSectionLabel}>Features</p>
        <div style={styles.featureRow}>
          <FeatureTag active={space.is_verified}    label="Verified" />
          <FeatureTag active={space.has_security}   label="Security" />
          <FeatureTag active={space.has_cctv}       label="CCTV" />
          <FeatureTag active={space.is_covered}     label="Covered" />
        </div>
      </div>

      {/* GPS */}
      {space.latitude && space.longitude && (
        <div style={styles.infoSection}>
          <p style={styles.infoSectionLabel}>GPS Coordinates</p>
          <p style={styles.infoValue}>{space.latitude}, {space.longitude}</p>
          <a
            href={`https://maps.google.com/?q=${space.latitude},${space.longitude}`}
            target="_blank"
            rel="noreferrer"
            style={styles.mapsLink}
          >
            Open in Google Maps →
          </a>
        </div>
      )}

      {/* Description / Notes */}
      {(space.description || space.notes) && (
        <div style={styles.infoSection}>
          <p style={styles.infoSectionLabel}>Notes</p>
          <p style={styles.infoValue}>{space.notes || space.description}</p>
        </div>
      )}

      {/* Action buttons */}
      <div style={styles.actions}>
        {status === 'pending' && (
          <>
            <Button
              style={{ flex: 1, justifyContent: 'center' }}
              loading={isLoading('approve')} onClick={onApprove}
            >
              <RiCheckLine size={16} /> Approve & Verify
            </Button>
            <Button
              variant="danger" style={{ flex: 1, justifyContent: 'center' }}
              loading={isLoading('reject')} onClick={onReject}
            >
              <RiCloseLine size={16} /> Reject
            </Button>
          </>
        )}
        {status === 'active' && (
          <Button
            variant="outline" style={{ flex: 1, justifyContent: 'center' }}
            loading={isLoading('deactivate')} onClick={onDeactivate}
          >
            Deactivate Space
          </Button>
        )}
        {status === 'inactive' && (
          <Button
            style={{ flex: 1, justifyContent: 'center' }}
            loading={isLoading('activate')} onClick={onActivate}
          >
            Reactivate Space
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Small components ───────────────────────────────────────────
function StatCard({ label, value, color, icon }) {
  return (
    <div style={{ ...styles.statCard, borderTop: `3px solid ${color}` }}>
      <span style={styles.statIcon}>{icon}</span>
      <span style={{ ...styles.statValue, color }}>{value ?? '—'}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div style={styles.infoItem}>
      <div style={styles.infoLabel}>{icon}<span>{label}</span></div>
      <p style={styles.infoItemValue}>{value || '—'}</p>
    </div>
  );
}

function FeatureTag({ active, label }) {
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600,
      background: active ? 'rgba(74,222,128,0.1)' : 'var(--ink-muted)',
      border: `1px solid ${active ? 'rgba(74,222,128,0.25)' : 'var(--border)'}`,
      color: active ? 'var(--green)' : 'var(--text-muted)',
    }}>
      {active ? '✓ ' : '✗ '}{label}
    </span>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = {
  page: { padding: '28px 32px 64px', minHeight: 'calc(100vh - 60px)' },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: 24,
  },
  title: { fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em' },
  refreshBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text-secondary)',
    fontSize: '0.82rem', cursor: 'pointer',
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16, marginBottom: 28,
  },
  statCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '18px 20px',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  statIcon: { fontSize: '1.2rem', marginBottom: 4 },
  statValue: { fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800 },
  statLabel: { fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.04em' },
  layout: { display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' },

  // List panel
  listPanel: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, overflow: 'hidden',
  },
  filters: { borderBottom: '1px solid var(--border)' },
  statusTabs: { display: 'flex', borderBottom: '1px solid var(--border-soft)' },
  statusTab: {
    flex: 1, padding: '12px 8px', background: 'transparent',
    border: 'none', borderBottom: '2px solid transparent',
    color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8, transition: 'all 150ms',
  },
  tabBadge: {
    padding: '1px 7px', borderRadius: 999,
    fontSize: '0.68rem', fontWeight: 800,
  },
  cityFilter: { display: 'flex', gap: 6, padding: '10px 14px', flexWrap: 'wrap' },
  cityChip: {
    padding: '4px 12px', borderRadius: 999,
    border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text-muted)',
    fontSize: '0.75rem', cursor: 'pointer', textTransform: 'capitalize',
  },
  cityChipActive: { background: 'var(--acid-glow)', border: '1px solid rgba(184,242,37,0.25)', color: 'var(--acid)' },
  list: { maxHeight: 600, overflowY: 'auto' },
  loadingState: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: 28, color: 'var(--text-muted)', fontSize: '0.85rem',
  },
  emptyState: { padding: '48px 24px', textAlign: 'center' },
  emptyIcon: { fontSize: '2.5rem', marginBottom: 12, opacity: 0.4 },
  emptyTitle: { color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 4 },
  emptySub: { color: 'var(--text-muted)', fontSize: '0.82rem' },
  spaceRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', borderBottom: '1px solid var(--border-soft)',
    cursor: 'pointer', transition: 'background 150ms',
  },
  spaceRowActive: { background: 'var(--acid-glow)' },
  spaceRowLeft: { flex: 1, minWidth: 0 },
  spaceRowTop: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 },
  spaceName: { fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' },
  verifiedBadge: {
    padding: '1px 7px', borderRadius: 999,
    background: 'rgba(184,242,37,0.1)', border: '1px solid rgba(184,242,37,0.2)',
    fontSize: '0.65rem', color: 'var(--acid)', fontWeight: 700,
  },
  spaceCity: { fontSize: '0.72rem', color: 'var(--acid)', textTransform: 'capitalize', marginBottom: 2 },
  spaceAddr: { fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 5 },
  spaceMetaRow: { display: 'flex', gap: 8, alignItems: 'center' },
  spaceMeta: { fontSize: '0.72rem', color: 'var(--text-secondary)' },
  sourceBadge: { fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em' },
  quickActions: { display: 'flex', gap: 6 },
  quickBtn: {
    width: 30, height: 30, borderRadius: 8, border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'opacity 150ms',
  },
  quickApprove: { background: 'rgba(74,222,128,0.15)', color: '#4ade80' },
  quickReject:  { background: 'rgba(248,113,113,0.15)', color: '#f87171' },

  // Detail panel
  detailPanel: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, overflow: 'hidden',
    position: 'sticky', top: 80,
  },
  detailEmpty: {
    padding: 60, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 12,
  },
  detailEmptyText: { color: 'var(--text-muted)', fontSize: '0.85rem' },
  detail: { padding: 24, display: 'flex', flexDirection: 'column', gap: 20 },
  detailTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  detailTitle: {
    fontFamily: 'var(--font-display)', fontSize: '1.2rem',
    fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4,
  },
  detailSub: { fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 },
  detailBadges: { display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' },
  statusDot: {
    padding: '3px 10px', borderRadius: 999,
    fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize',
  },
  sourceTag: {
    fontSize: '0.65rem', color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  infoItem: {
    background: 'var(--ink-soft)', borderRadius: 8,
    padding: '8px 12px', border: '1px solid var(--border-soft)',
  },
  infoLabel: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: '0.68rem', color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
  },
  infoItemValue: { fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600, textTransform: 'capitalize' },
  infoSection: { display: 'flex', flexDirection: 'column', gap: 8 },
  infoSectionLabel: {
    fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  infoValue: { fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 },
  daysRow: { display: 'flex', gap: 5 },
  dayDot: {
    padding: '3px 8px', borderRadius: 6,
    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.04em',
    background: 'var(--ink-muted)', color: 'var(--text-muted)',
    border: '1px solid var(--border)',
  },
  dayDotActive: {
    background: 'var(--acid-glow)', color: 'var(--acid)',
    border: '1px solid rgba(184,242,37,0.25)',
  },
  featureRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  mapsLink: {
    fontSize: '0.78rem', color: 'var(--acid)',
    textDecoration: 'none', fontWeight: 600,
  },
  actions: { display: 'flex', gap: 10, paddingTop: 4 },
};