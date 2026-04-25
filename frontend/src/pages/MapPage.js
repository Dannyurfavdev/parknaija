import React, { useState, useEffect, useCallback } from 'react';
import ParkingMap, { CITY_CENTERS } from '../components/map/ParkingMap';
import { listingsAPI, recommendAPI } from '../services/api';
import { ScoreRing, AvailBadge, Button, SectionLabel } from '../components/ui/UIKit';
import toast from 'react-hot-toast';
import {
  RiMapPinLine, RiSearchLine, RiFilterLine,
  RiCloseLine, RiArrowRightLine, RiCarLine,
  RiMoneyDollarCircleLine, RiShieldCheckLine,
} from 'react-icons/ri';

const CITIES = [
  { value: 'port_harcourt', label: '⚡ Port Harcourt' },
  { value: 'lagos',         label: '🌊 Lagos' },
  { value: 'abuja',         label: '🏛️ Abuja' },
];

const AREA_TYPES = [
  { value: '',            label: 'All Areas' },
  { value: 'commercial',  label: 'Commercial' },
  { value: 'residential', label: 'Residential' },
  { value: 'market',      label: 'Market' },
  { value: 'mixed',       label: 'Mixed Use' },
];

export default function MapPage() {
  const [city, setCity]               = useState('port_harcourt');
  const [areaType, setAreaType]       = useState('');
  const [search, setSearch]           = useState('');
  const [spaces, setSpaces]           = useState([]);
  const [loading, setLoading]         = useState(false);
  const [selected, setSelected]       = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode]       = useState('browse'); // 'browse' | 'recommend'

  // Recommendation state
  const [recForm, setRecForm] = useState({
    duration_hours: 2,
    budget_per_hour: '',
    datetime: new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16),
  });
  const [recResults, setRecResults] = useState(null);
  const [recLoading, setRecLoading] = useState(false);

  // Fetch listings on city/filter change
  useEffect(() => {
    fetchSpaces();
  }, [city, areaType]); // eslint-disable-line

  const fetchSpaces = async () => {
    setLoading(true);
    try {
      const params = { city, ...(areaType && { area_type: areaType }) };
      const { data } = await listingsAPI.list(params);
      // API returns paginated results
      const results = data.results || data;
      setSpaces(Array.isArray(results) ? results : []);
    } catch {
      toast.error('Could not load spaces');
    } finally {
      setLoading(false);
    }
  };

  const getMyLocation = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        setUserLocation({ lat: coords.latitude, lng: coords.longitude });
        toast.success('Location found!');
      },
      () => toast.error('Could not get your location'),
    );
  }, []);

  const handleRecommend = async () => {
    if (!userLocation) return toast.error('Enable your location first to get recommendations');
    setRecLoading(true);
    try {
      const { data } = await recommendAPI.get({
        city,
        area_type: areaType || 'mixed',
        datetime: new Date(recForm.datetime).toISOString(),
        duration_hours: Number(recForm.duration_hours),
        lat: userLocation.lat,
        lng: userLocation.lng,
        ...(recForm.budget_per_hour ? { budget_per_hour: Number(recForm.budget_per_hour) } : {}),
      });
      setRecResults(data);
      // Merge scores back into spaces
      const scoredIds = new Map(data.recommendations.map(r => [r.id, r]));
      setSpaces(prev => prev.map(s => scoredIds.has(s.id) ? { ...s, ...scoredIds.get(s.id) } : s));
      toast.success(`Top ${data.recommendations.length} spaces found!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Recommendation failed');
    } finally {
      setRecLoading(false);
    }
  };

  const filteredSpaces = spaces.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) ||
               s.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.page}>
      {/* ── Map fills full area ── */}
      <div style={styles.mapWrap}>
        <ParkingMap
          spaces={filteredSpaces}
          city={city}
          userLocation={userLocation}
          selectedId={selected?.id}
          onSpaceSelect={setSelected}
        />

        {/* Floating top bar */}
        <div style={styles.topBar}>
          <div style={styles.topBarInner}>
            {/* City switcher */}
            <div style={styles.cityTabs}>
              {CITIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => { setCity(c.value); setSelected(null); setRecResults(null); }}
                  style={{ ...styles.cityTab, ...(city === c.value ? styles.cityTabActive : {}) }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={styles.searchWrap}>
              <RiSearchLine size={15} color="#555" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search spaces..."
                style={styles.searchInput}
              />
            </div>

            {/* Area filter */}
            <select
              value={areaType} onChange={e => setAreaType(e.target.value)}
              style={styles.areaSelect}
            >
              {AREA_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>

            {/* GPS button */}
            <button onClick={getMyLocation} style={styles.gpsBtn}>
              <RiMapPinLine size={15} />
              {userLocation ? 'Located' : 'My Location'}
            </button>

            {/* Sidebar toggle */}
            <button onClick={() => setSidebarOpen(o => !o)} style={styles.sidebarToggle}>
              {sidebarOpen ? <RiCloseLine size={18} /> : <RiFilterLine size={18} />}
            </button>
          </div>
        </div>

        {/* Space count badge */}
        <div style={styles.countBadge}>
          {loading
            ? <span style={styles.countText}>Loading...</span>
            : <span style={styles.countText}>{filteredSpaces.length} space{filteredSpaces.length !== 1 ? 's' : ''} in {city.replace('_', ' ')}</span>
          }
        </div>
      </div>

      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <aside style={styles.sidebar}>
          {/* Mode tabs */}
          <div style={styles.modeTabs}>
            <button
              style={{ ...styles.modeTab, ...(viewMode === 'browse' ? styles.modeTabActive : {}) }}
              onClick={() => setViewMode('browse')}
            >
              Browse
            </button>
            <button
              style={{ ...styles.modeTab, ...(viewMode === 'recommend' ? styles.modeTabActive : {}) }}
              onClick={() => setViewMode('recommend')}
            >
              🤖 AI Recommend
            </button>
          </div>

          {/* ── Browse Mode ── */}
          {viewMode === 'browse' && (
            <div style={styles.spaceList}>
              {loading && (
                <div style={styles.loadingRow}>
                  <div className="spinner" />
                  <span style={styles.loadingText}>Loading spaces...</span>
                </div>
              )}
              {!loading && filteredSpaces.length === 0 && (
                <div style={styles.emptyState}>
                  <p style={styles.emptyIcon}>🅿️</p>
                  <p style={styles.emptyTitle}>No spaces found</p>
                  <p style={styles.emptySub}>Try changing city or area filter</p>
                </div>
              )}
              {filteredSpaces.map(space => (
                <SpaceListItem
                  key={space.id}
                  space={space}
                  isSelected={selected?.id === space.id}
                  onClick={() => setSelected(s => s?.id === space.id ? null : space)}
                />
              ))}
            </div>
          )}

          {/* ── AI Recommend Mode ── */}
          {viewMode === 'recommend' && (
            <div style={styles.recPanel}>
              <SectionLabel>AI Recommendation</SectionLabel>
              <p style={styles.recHint}>
                {userLocation
                  ? '✅ Location captured — ready to find your best options.'
                  : '⚠️ Enable your location above for distance-ranked results.'}
              </p>

              <div style={styles.recForm}>
                <label style={styles.recLabel}>Date & Time</label>
                <input
                  type="datetime-local"
                  value={recForm.datetime}
                  onChange={e => setRecForm(f => ({ ...f, datetime: e.target.value }))}
                />

                <label style={styles.recLabel}>Duration (hours)</label>
                <input
                  type="number" min={0.5} max={24} step={0.5}
                  value={recForm.duration_hours}
                  onChange={e => setRecForm(f => ({ ...f, duration_hours: e.target.value }))}
                />

                <label style={styles.recLabel}>Budget per Hour (₦) <span style={{ color: '#555', fontWeight: 400 }}>optional</span></label>
                <input
                  type="number" min={0} step={100} placeholder="e.g. 2000"
                  value={recForm.budget_per_hour}
                  onChange={e => setRecForm(f => ({ ...f, budget_per_hour: e.target.value }))}
                />
              </div>

              <Button
                size="md" loading={recLoading} onClick={handleRecommend}
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
              >
                <RiSearchLine size={15} />
                {recLoading ? 'Finding best...' : 'Find Best Parking'}
              </Button>

              {/* Results */}
              {recResults?.recommendations?.length > 0 && (
                <div style={styles.recResults}>
                  <p style={styles.recResultsLabel}>
                    Top {recResults.recommendations.length} Results
                    <span style={styles.recPressure}>
                      {recResults.situation?.pressure_score}% demand
                    </span>
                  </p>
                  {recResults.recommendations.map((r, i) => (
                    <RecResultItem
                      key={r.id} space={r} rank={i}
                      isSelected={selected?.id === r.id}
                      onClick={() => setSelected(r)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Selected Space Detail ── */}
          {selected && (
            <div style={styles.detailPanel}>
              <div style={styles.detailHeader}>
                <div style={{ flex: 1 }}>
                  <p style={styles.detailName}>{selected.name}</p>
                  <p style={styles.detailAddress}>{selected.address}</p>
                </div>
                <button onClick={() => setSelected(null)} style={styles.closeBtn}>
                  <RiCloseLine size={16} />
                </button>
              </div>

              <div style={styles.detailStats}>
                <DetailStat icon={<RiMoneyDollarCircleLine size={14} />}
                  label="Price/hr"
                  value={`₦${Number(selected.price_per_hour).toLocaleString()}`} />
                <DetailStat icon={<RiCarLine size={14} />}
                  label="Capacity"
                  value={`${selected.capacity} cars`} />
                {selected.distance_km != null && (
                  <DetailStat icon={<RiMapPinLine size={14} />}
                    label="Distance"
                    value={`${selected.distance_km} km`} />
                )}
                {selected.availability && (
                  <DetailStat icon={null}
                    label="Availability"
                    value={<AvailBadge level={selected.availability} />} />
                )}
              </div>

              {selected.parking_score && (
                <div style={styles.scoreRow}>
                  <ScoreRing score={selected.parking_score} size={52} />
                  <div>
                    <p style={styles.scoreLabel}>Parking Score</p>
                    <p style={styles.scoreReason}>{selected.why_recommended || 'Based on price, distance & availability.'}</p>
                  </div>
                </div>
              )}

              <div style={styles.featureChips}>
                {selected.features?.is_verified  && <Chip>✓ Verified</Chip>}
                {selected.features?.has_security && <Chip>🛡️ Security</Chip>}
                {selected.features?.has_cctv     && <Chip>📷 CCTV</Chip>}
                {selected.features?.is_covered   && <Chip>🏠 Covered</Chip>}
              </div>

              {selected.notes && (
                <p style={styles.detailNotes}>{selected.notes}</p>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function SpaceListItem({ space, isSelected, onClick }) {
  return (
    <div onClick={onClick} style={{ ...styles.listItem, ...(isSelected ? styles.listItemActive : {}) }}>
      <div style={styles.listItemLeft}>
        <p style={styles.listItemName}>{space.name}</p>
        <p style={styles.listItemAddr}>{space.address?.slice(0, 50)}{space.address?.length > 50 ? '…' : ''}</p>
        <div style={styles.listItemMeta}>
          <span style={styles.metaChip}>₦{Number(space.price_per_hour).toLocaleString()}/hr</span>
          <span style={styles.metaChip}>{space.capacity} car{space.capacity !== 1 ? 's' : ''}</span>
          {space.is_verified && <span style={{ ...styles.metaChip, color: 'var(--acid)', borderColor: 'rgba(184,242,37,0.2)' }}>✓</span>}
        </div>
      </div>
      {space.parking_score && (
        <ScoreRing score={space.parking_score} size={40} />
      )}
      <RiArrowRightLine size={14} color="var(--text-muted)" />
    </div>
  );
}

function RecResultItem({ space, rank, isSelected, onClick }) {
  const rankColors = ['#b8f225', '#888', '#666'];
  return (
    <div onClick={onClick} style={{ ...styles.recItem, ...(isSelected ? styles.recItemActive : {}) }}>
      <div style={{ ...styles.recRank, background: rankColors[rank] || '#444' }}>#{rank + 1}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={styles.recItemName}>{space.name}</p>
        <p style={styles.recItemAddr}>{space.address?.slice(0, 45)}…</p>
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <span style={styles.metaChip}>₦{Number(space.price_per_hour).toLocaleString()}/hr</span>
          {space.distance_km && <span style={styles.metaChip}>{space.distance_km}km</span>}
          <AvailBadge level={space.availability} />
        </div>
      </div>
      <ScoreRing score={space.parking_score} size={40} />
    </div>
  );
}

function DetailStat({ icon, label, value }) {
  return (
    <div style={styles.detailStatItem}>
      <div style={styles.detailStatLabel}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={styles.detailStatValue}>{value}</div>
    </div>
  );
}

function Chip({ children }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999,
      background: 'var(--acid-glow)', border: '1px solid rgba(184,242,37,0.15)',
      fontSize: '0.7rem', color: 'var(--acid)',
    }}>
      {children}
    </span>
  );
}

// ── Styles ─────────────────────────────────────────────────────
const styles = {
  page: {
    display: 'flex', height: 'calc(100vh - 60px)',
    position: 'relative', overflow: 'hidden',
  },
  mapWrap: { flex: 1, position: 'relative' },

  topBar: {
    position: 'absolute', top: 16, left: 16, right: 16, zIndex: 10,
  },
  topBarInner: {
    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(16px)',
    border: '1px solid #2a2a2a', borderRadius: 12,
    padding: '10px 14px',
  },
  cityTabs: { display: 'flex', gap: 4 },
  cityTab: {
    padding: '5px 12px', borderRadius: 8,
    border: '1px solid transparent',
    background: 'transparent', color: '#888',
    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
    transition: 'all 150ms',
  },
  cityTabActive: {
    background: 'var(--acid-glow)', border: '1px solid rgba(184,242,37,0.25)',
    color: 'var(--acid)',
  },
  searchWrap: { position: 'relative', flex: 1, minWidth: 140 },
  searchInput: {
    paddingLeft: 34, height: 34, borderRadius: 8,
    fontSize: '0.82rem', background: '#161616',
    border: '1px solid #2a2a2a', width: '100%',
  },
  areaSelect: {
    height: 34, borderRadius: 8, fontSize: '0.82rem',
    background: '#161616', border: '1px solid #2a2a2a',
    color: '#f0f0f0', padding: '0 10px', width: 'auto',
  },
  gpsBtn: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '5px 12px', borderRadius: 8,
    background: 'var(--acid-glow)', border: '1px solid rgba(184,242,37,0.2)',
    color: 'var(--acid)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  sidebarToggle: {
    width: 34, height: 34, borderRadius: 8,
    background: '#1c1c1c', border: '1px solid #2a2a2a',
    color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },
  countBadge: {
    position: 'absolute', bottom: 56, left: 16, zIndex: 10,
    background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(8px)',
    border: '1px solid #2a2a2a', borderRadius: 8,
    padding: '5px 12px',
  },
  countText: { fontSize: '0.75rem', color: '#888' },

  // Sidebar
  sidebar: {
    width: 340, flexShrink: 0,
    background: 'var(--surface)',
    borderLeft: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    overflowY: 'auto',
  },
  modeTabs: {
    display: 'flex', borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  modeTab: {
    flex: 1, padding: '12px 8px',
    background: 'transparent', border: 'none',
    color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600,
    cursor: 'pointer', transition: 'all 150ms',
    borderBottom: '2px solid transparent',
  },
  modeTabActive: {
    color: 'var(--acid)',
    borderBottom: '2px solid var(--acid)',
    background: 'var(--acid-glow)',
  },
  spaceList: {
    flex: 1, overflowY: 'auto', padding: '8px',
  },
  loadingRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: 20, color: 'var(--text-muted)', fontSize: '0.85rem',
  },
  loadingText: { color: 'var(--text-muted)', fontSize: '0.85rem' },
  emptyState: { padding: '40px 16px', textAlign: 'center' },
  emptyIcon: { fontSize: '2rem', marginBottom: 8 },
  emptyTitle: { color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 },
  emptySub: { color: 'var(--text-muted)', fontSize: '0.8rem' },

  listItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '12px 10px', borderRadius: 10, marginBottom: 4,
    cursor: 'pointer', border: '1px solid transparent',
    transition: 'all 150ms',
  },
  listItemActive: {
    background: 'var(--acid-glow)', border: '1px solid rgba(184,242,37,0.2)',
  },
  listItemLeft: { flex: 1, minWidth: 0 },
  listItemName: {
    fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)',
    marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  listItemAddr: { fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 5 },
  listItemMeta: { display: 'flex', gap: 5, flexWrap: 'wrap' },
  metaChip: {
    padding: '1px 7px', borderRadius: 999,
    background: 'var(--ink-muted)', border: '1px solid var(--border)',
    fontSize: '0.7rem', color: 'var(--text-secondary)',
  },

  // Recommend panel
  recPanel: { padding: 16, display: 'flex', flexDirection: 'column', gap: 10 },
  recHint: { fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 },
  recForm: { display: 'flex', flexDirection: 'column', gap: 8 },
  recLabel: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' },
  recResults: { borderTop: '1px solid var(--border)', paddingTop: 12 },
  recResultsLabel: {
    fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'flex', justifyContent: 'space-between',
    marginBottom: 8,
  },
  recPressure: { color: 'var(--text-muted)', fontWeight: 400 },
  recItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 8px', borderRadius: 10, marginBottom: 6,
    cursor: 'pointer', border: '1px solid transparent',
    transition: 'all 150ms', background: 'var(--ink-soft)',
  },
  recItemActive: {
    border: '1px solid rgba(184,242,37,0.25)', background: 'var(--acid-glow)',
  },
  recRank: {
    width: 22, height: 22, borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.65rem', fontWeight: 800, color: 'var(--ink)', flexShrink: 0,
  },
  recItemName: { fontSize: '0.82rem', fontWeight: 700, marginBottom: 2, color: 'var(--text-primary)' },
  recItemAddr: { fontSize: '0.72rem', color: 'var(--text-muted)' },

  // Detail panel
  detailPanel: {
    borderTop: '1px solid var(--border)', padding: 16,
    background: 'linear-gradient(180deg, var(--acid-glow) 0%, transparent 60%)',
    flexShrink: 0,
  },
  detailHeader: { display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14 },
  detailName: {
    fontFamily: 'var(--font-display)', fontSize: '1rem',
    fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3,
  },
  detailAddress: { fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
    background: 'var(--ink-muted)', border: '1px solid var(--border)',
    color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer',
  },
  detailStats: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: 8, marginBottom: 12,
  },
  detailStatItem: {
    background: 'var(--ink-soft)', borderRadius: 8,
    padding: '8px 10px', border: '1px solid var(--border-soft)',
  },
  detailStatLabel: {
    display: 'flex', alignItems: 'center', gap: 4,
    fontSize: '0.68rem', color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3,
  },
  detailStatValue: { fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' },
  scoreRow: {
    display: 'flex', gap: 12, alignItems: 'center',
    padding: '10px 12px', borderRadius: 10,
    background: 'var(--ink-soft)', border: '1px solid var(--border)',
    marginBottom: 10,
  },
  scoreLabel: { fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 3 },
  scoreReason: { fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 },
  featureChips: { display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 },
  detailNotes: {
    fontSize: '0.78rem', color: 'var(--text-secondary)',
    lineHeight: 1.5, borderLeft: '2px solid var(--acid-dim)',
    paddingLeft: 10, marginTop: 4,
  },
};
