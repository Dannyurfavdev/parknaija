import React, { useState } from 'react';
import { recommendAPI, predictAPI } from '../services/api';
import ParkingCard from '../components/listings/ParkingCard';
import { Button, Field, SectionLabel, EmptyState, AvailBadge } from '../components/ui/UIKit';
import toast from 'react-hot-toast';
import { RiSearchLine, RiMapPinLine, RiTimeLine } from 'react-icons/ri';

const CITIES = [
  { value: 'lagos',         label: '🌊 Lagos' },
  { value: 'port_harcourt', label: '⚡ Port Harcourt' },
  { value: 'abuja',         label: '🏛️ Abuja' },
];

const AREA_TYPES = [
  { value: 'commercial',  label: 'Commercial' },
  { value: 'residential', label: 'Residential' },
  { value: 'market',      label: 'Market Area' },
  { value: 'mixed',       label: 'Mixed Use' },
  { value: 'religious',   label: 'Religious/Event' },
];

const defaultForm = {
  city: 'lagos',
  area_type: 'commercial',
  datetime: new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16),
  duration_hours: 2,
  budget_per_hour: '',
  lat: '',
  lng: '',
};

export default function FindParkingPage() {
  const [form, setForm] = useState(defaultForm);
  const [results, setResults] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);
    setPrediction(null);

    try {
      const payload = {
        city: form.city,
        area_type: form.area_type,
        datetime: new Date(form.datetime).toISOString(),
        duration_hours: Number(form.duration_hours),
        ...(form.budget_per_hour ? { budget_per_hour: Number(form.budget_per_hour) } : {}),
        ...(form.lat && form.lng ? { lat: Number(form.lat), lng: Number(form.lng) } : {}),
      };

      const [recRes, predRes] = await Promise.all([
        recommendAPI.get(payload),
        predictAPI.get({
          city: form.city,
          area_type: form.area_type,
          datetime: payload.datetime,
        }),
      ]);

      setResults(recRes.data);
      setPrediction(predRes.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Search failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm(f => ({
          ...f,
          lat: coords.latitude.toFixed(6),
          lng: coords.longitude.toFixed(6),
        }));
        toast.success('Location captured!');
      },
      () => toast.error('Could not get location'),
    );
  };

  return (
    <main style={styles.page}>
      <div className="container" style={styles.layout}>

        {/* ── Search Panel ── */}
        <aside style={styles.panel}>
          <div style={styles.panelHeader}>
            <SectionLabel>Park Naija AI</SectionLabel>
            <h1 style={styles.panelTitle}>Find Parking</h1>
            <p style={styles.panelSub}>
              Get AI-ranked recommendations with real availability scores.
            </p>
          </div>

          <form onSubmit={handleSearch} style={styles.form}>
            <Field label="City" required>
              <select value={form.city} onChange={set('city')}>
                {CITIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>

            <Field label="Area Type" hint="Helps predict availability">
              <select value={form.area_type} onChange={set('area_type')}>
                {AREA_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </Field>

            <Field label="Date & Time" required>
              <input type="datetime-local" value={form.datetime} onChange={set('datetime')} />
            </Field>

            <Field label="Duration (hours)">
              <input type="number" min={0.5} max={24} step={0.5}
                value={form.duration_hours} onChange={set('duration_hours')} />
            </Field>

            <Field label="Budget per Hour (₦)" hint="Optional — leave blank to see all options">
              <input type="number" min={0} step={100} placeholder="e.g. 2000"
                value={form.budget_per_hour} onChange={set('budget_per_hour')} />
            </Field>

            {/* Location */}
            <div style={styles.locationGroup}>
              <div style={styles.locationHeader}>
                <span style={styles.locationLabel}>Your Location</span>
                <button type="button" onClick={useMyLocation} style={styles.gpsBtn}>
                  <RiMapPinLine size={13} /> Use GPS
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input type="text" placeholder="Latitude" value={form.lat} onChange={set('lat')} />
                <input type="text" placeholder="Longitude" value={form.lng} onChange={set('lng')} />
              </div>
              <p style={styles.locationHint}>Optional — enables distance sorting</p>
            </div>

            <Button type="submit" size="lg" loading={loading} style={{ width: '100%', justifyContent: 'center' }}>
              <RiSearchLine size={17} />
              {loading ? 'Searching...' : 'Find Parking'}
            </Button>
          </form>
        </aside>

        {/* ── Results Panel ── */}
        <section style={styles.results}>
          {/* Prediction summary */}
          {prediction && <PredictionBanner prediction={prediction} />}

          {/* Recommendations */}
          {results && (
            <div>
              <div style={styles.resultHeader}>
                <div>
                  <SectionLabel>Results</SectionLabel>
                  <h2 style={styles.resultTitle}>
                    {results.recommendations.length > 0
                      ? `Top ${results.recommendations.length} Matches`
                      : 'No Matches Found'}
                  </h2>
                </div>
                {results.situation && (
                  <div style={styles.situationBadge}>
                    <span style={styles.situationLabel}>Overall</span>
                    <AvailBadge level={results.situation.overall_availability} />
                    <span style={styles.pressureText}>
                      {results.situation.pressure_score}% demand
                    </span>
                  </div>
                )}
              </div>

              {results.recommendations.length > 0 ? (
                <div style={styles.cardList} className="stagger">
                  {results.recommendations.map((space, i) => (
                    <ParkingCard key={space.id} space={space} rank={i} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="🅿️"
                  title="No spaces found for this search"
                  subtitle="Try a different city, remove your budget filter, or check back later."
                />
              )}
            </div>
          )}

          {!results && !loading && (
            <EmptyState
              icon="🔍"
              title="Your results will appear here"
              subtitle="Fill in the search form and hit Find Parking."
            />
          )}
        </section>
      </div>
    </main>
  );
}

function PredictionBanner({ prediction }) {
  return (
    <div style={predStyles.banner}>
      <div style={predStyles.header}>
        <div style={predStyles.left}>
          <RiTimeLine size={16} color="var(--acid)" />
          <span style={predStyles.title}>Availability Prediction</span>
          <AvailBadge level={prediction.availability} />
        </div>
        <span style={predStyles.pressure}>{prediction.pressure_score}% demand pressure</span>
      </div>
      <p style={predStyles.summary}>{prediction.summary}</p>
      {prediction.tips?.length > 0 && (
        <div style={predStyles.tips}>
          {prediction.tips.map((tip, i) => (
            <div key={i} style={predStyles.tip}>
              <span style={predStyles.tipDot}>→</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
      {prediction.best_time_window && (
        <div style={predStyles.bestTime}>
          Best window today: <strong style={{ color: 'var(--acid)' }}>{prediction.best_time_window}</strong>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '32px 0 64px', minHeight: 'calc(100vh - 60px)' },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(300px, 360px) 1fr',
    gap: 32, alignItems: 'start',
  },
  panel: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    overflow: 'hidden',
    position: 'sticky', top: 80,
  },
  panelHeader: {
    padding: '28px 28px 0',
    borderBottom: '1px solid var(--border)',
    paddingBottom: 24,
    background: 'linear-gradient(180deg, var(--acid-glow) 0%, transparent 100%)',
  },
  panelTitle: {
    fontFamily: 'var(--font-display)', fontSize: '1.6rem',
    fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6,
  },
  panelSub: { fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 },
  form: { padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
  locationGroup: {
    background: 'var(--ink-soft)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: 14,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  locationHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  locationLabel: { fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' },
  gpsBtn: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'var(--acid-glow)', border: '1px solid rgba(184,242,37,0.2)',
    borderRadius: 'var(--radius-pill)', color: 'var(--acid)',
    fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', cursor: 'pointer',
  },
  locationHint: { fontSize: '0.72rem', color: 'var(--text-muted)' },
  results: { minHeight: 400 },
  resultHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: 20,
  },
  resultTitle: {
    fontFamily: 'var(--font-display)', fontSize: '1.4rem',
    fontWeight: 800, letterSpacing: '-0.02em',
  },
  situationBadge: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4,
  },
  situationLabel: { fontSize: '0.68rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' },
  pressureText: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  cardList: { display: 'flex', flexDirection: 'column', gap: 20 },
};

const predStyles = {
  banner: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderLeft: '3px solid var(--acid)',
    borderRadius: 'var(--radius-md)', padding: '16px 20px', marginBottom: 24,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  left: { display: 'flex', alignItems: 'center', gap: 8 },
  title: { fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' },
  pressure: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  summary: { fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 },
  tips: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 },
  tip: { display: 'flex', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' },
  tipDot: { color: 'var(--acid)', fontWeight: 700, flexShrink: 0 },
  bestTime: { fontSize: '0.8rem', color: 'var(--text-muted)', paddingTop: 8, borderTop: '1px solid var(--border-soft)' },
};
