import React, { useState } from 'react';
import { listingsAPI } from '../services/api';
import { Button, Field, SectionLabel, Card } from '../components/ui/UIKit';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RiAddLine } from 'react-icons/ri';

const CITIES     = [{ value: 'lagos', label: 'Lagos' }, { value: 'port_harcourt', label: 'Port Harcourt' }, { value: 'abuja', label: 'Abuja' }];
const AREA_TYPES = [{ value: 'commercial', label: 'Commercial' }, { value: 'residential', label: 'Residential' }, { value: 'market', label: 'Market Area' }, { value: 'mixed', label: 'Mixed Use' }, { value: 'religious', label: 'Religious/Event' }];
const DAYS       = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

const defaultForm = {
  name: '', description: '', city: 'lagos', area_type: 'mixed',
  address: '', latitude: '', longitude: '',
  capacity: 1, price_per_hour: '', price_is_negotiable: false,
  available_from: '07:00', available_until: '21:00',
  available_days: ['monday','tuesday','wednesday','thursday','friday'],
  has_security: false, is_covered: false, has_cctv: false, notes: '',
};

export default function SubmitSpacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <main style={styles.page}>
        <div className="container-sm" style={{ textAlign: 'center', paddingTop: 80 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🔒</div>
          <h2 style={styles.title}>Login Required</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            You need an account to list a parking space.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link to="/login"><Button>Login</Button></Link>
            <Link to="/register"><Button variant="outline">Sign Up Free</Button></Link>
          </div>
        </div>
      </main>
    );
  }

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [k]: val }));
  };

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      available_days: f.available_days.includes(day)
        ? f.available_days.filter(d => d !== day)
        : [...f.available_days, day],
    }));
  };

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      setForm(f => ({ ...f, latitude: coords.latitude.toFixed(6), longitude: coords.longitude.toFixed(6) }));
      toast.success('Location set!');
    }, () => toast.error('Could not get location'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.address || !form.price_per_hour) {
      return toast.error('Please fill in name, address, and price');
    }
    setLoading(true);
    try {
      await listingsAPI.create({
        ...form,
        capacity: Number(form.capacity),
        price_per_hour: Number(form.price_per_hour),
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      });
      toast.success('Space submitted! It will appear after admin review.');
      navigate('/find');
    } catch (err) {
      const errors = err.response?.data;
      const msg = typeof errors === 'object'
        ? Object.values(errors).flat().join(' ')
        : 'Submission failed.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <div className="container-sm">
        <div style={styles.header}>
          <SectionLabel>Space Owner</SectionLabel>
          <h1 style={styles.title}>List Your Parking Space</h1>
          <p style={styles.sub}>
            Earn money from unused space. Your listing will be reviewed and published within 24 hours.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Section: Basic Info */}
          <FormSection title="Basic Information">
            <Field label="Space Name" required hint="e.g. 'Compound behind GTB Rumuola'">
              <input value={form.name} onChange={set('name')} placeholder="Give it a recognizable name" />
            </Field>
            <div style={styles.row2}>
              <Field label="City" required>
                <select value={form.city} onChange={set('city')}>
                  {CITIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Area Type">
                <select value={form.area_type} onChange={set('area_type')}>
                  {AREA_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Full Address / Landmark" required>
              <input value={form.address} onChange={set('address')} placeholder="e.g. No 5 Rumuola Road, beside Access Bank" />
            </Field>
            <Field label="Description" hint="Optional — help drivers find you">
              <textarea value={form.description} onChange={set('description')} rows={3} placeholder="Describe the space, how to enter, what to look for..." />
            </Field>
          </FormSection>

          {/* Section: GPS */}
          <FormSection title="GPS Location">
            <p style={styles.sectionHint}>Optional but strongly recommended — enables distance ranking in search results.</p>
            <div style={styles.row2}>
              <Field label="Latitude">
                <input type="number" step="any" value={form.latitude} onChange={set('latitude')} placeholder="e.g. 4.8156" />
              </Field>
              <Field label="Longitude">
                <input type="number" step="any" value={form.longitude} onChange={set('longitude')} placeholder="e.g. 7.0498" />
              </Field>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
              📍 Use My Current Location
            </Button>
          </FormSection>

          {/* Section: Pricing */}
          <FormSection title="Pricing & Capacity">
            <div style={styles.row2}>
              <Field label="Price per Hour (₦)" required>
                <input type="number" min={0} step={100} value={form.price_per_hour} onChange={set('price_per_hour')} placeholder="e.g. 1500" />
              </Field>
              <Field label="Number of Cars" required>
                <input type="number" min={1} max={100} value={form.capacity} onChange={set('capacity')} />
              </Field>
            </div>
            <label style={styles.checkRow}>
              <input type="checkbox" checked={form.price_is_negotiable} onChange={set('price_is_negotiable')} />
              <span style={styles.checkLabel}>Price is negotiable</span>
            </label>
          </FormSection>

          {/* Section: Availability */}
          <FormSection title="Availability">
            <div style={styles.row2}>
              <Field label="Available From">
                <input type="time" value={form.available_from} onChange={set('available_from')} />
              </Field>
              <Field label="Available Until">
                <input type="time" value={form.available_until} onChange={set('available_until')} />
              </Field>
            </div>
            <Field label="Available Days">
              <div style={styles.daysGrid}>
                {DAYS.map(d => (
                  <button
                    key={d} type="button"
                    onClick={() => toggleDay(d)}
                    style={{
                      ...styles.dayBtn,
                      ...(form.available_days.includes(d) ? styles.dayBtnActive : {}),
                    }}
                  >
                    {d.slice(0, 3).toUpperCase()}
                  </button>
                ))}
              </div>
            </Field>
          </FormSection>

          {/* Section: Features */}
          <FormSection title="Features & Security">
            {[
              { key: 'has_security', label: '🛡️ On-site security / gateman' },
              { key: 'is_covered',   label: '🏠 Covered / indoor parking' },
              { key: 'has_cctv',     label: '📷 CCTV cameras' },
            ].map(({ key, label }) => (
              <label key={key} style={styles.checkRow}>
                <input type="checkbox" checked={form[key]} onChange={set(key)} />
                <span style={styles.checkLabel}>{label}</span>
              </label>
            ))}
            <Field label="Special Notes" hint="Entry instructions, restrictions, landmarks, contact">
              <textarea value={form.notes} onChange={set('notes')} rows={3}
                placeholder="e.g. Call 08012345678 when you arrive. Gate is blue." />
            </Field>
          </FormSection>

          <Button type="submit" size="lg" loading={loading}
            style={{ width: '100%', justifyContent: 'center' }}>
            <RiAddLine size={18} />
            {loading ? 'Submitting...' : 'Submit Space for Review'}
          </Button>
          <p style={styles.reviewNote}>
            ℹ️ Your listing will be reviewed by our team and published within 24 hours.
          </p>
        </form>
      </div>
    </main>
  );
}

function FormSection({ title, children }) {
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700,
        color: 'var(--acid)', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
        {title}
      </h3>
      {children}
    </Card>
  );
}

const styles = {
  page: { padding: '40px 0 80px' },
  header: { marginBottom: 32 },
  title: { fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 10 },
  sub: { fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.65 },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  sectionHint: { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 },
  checkRow: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  checkLabel: { fontSize: '0.88rem', color: 'var(--text-secondary)' },
  daysGrid: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  dayBtn: {
    padding: '6px 12px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--ink-muted)',
    color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700,
    cursor: 'pointer', letterSpacing: '0.04em',
  },
  dayBtnActive: {
    background: 'var(--acid-glow)', border: '1px solid rgba(184,242,37,0.3)',
    color: 'var(--acid)',
  },
  reviewNote: { textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' },
};
