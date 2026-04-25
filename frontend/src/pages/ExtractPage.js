import React, { useState } from 'react';
import { extractAPI, listingsAPI } from '../services/api';
import { Button, Card, SectionLabel, Field } from '../components/ui/UIKit';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { RiMagicLine, RiSaveLine, RiWhatsappLine } from 'react-icons/ri';

const EXAMPLES = [
  "Park for 2 cars in my compound at rumuola junction PH, 1500 per hour, available weekdays till 9pm, gateman dey there",
  "Space for 5 cars, wuse 2 abuja beside zenith bank, open daily 7am-10pm, 2000 naira per hour, no security",
  "My garage dey lekki phase 1, fit take 3 cars, 1k per hour negotiable, available anytime call me",
];

export default function ExtractPage() {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleExtract = async () => {
    if (!text.trim()) return toast.error('Please enter a parking message');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await extractAPI.parse(text);
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Extraction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return toast.error('Please log in to save a listing');
    if (!result?.extracted) return;
    setSaving(true);
    const ex = result.extracted;
    try {
      await listingsAPI.create({
        name: ex.name || 'Unnamed Space',
        city: ex.city !== 'unknown' ? ex.city : 'lagos',
        address: ex.address || 'See notes',
        capacity: ex.capacity || 1,
        price_per_hour: ex.price_per_hour || 0,
        price_is_negotiable: ex.price_is_negotiable || false,
        available_from: ex.available_from || null,
        available_until: ex.available_until || null,
        available_days: ex.available_days || [],
        has_security: ex.has_security || false,
        notes: ex.notes || result.input_text,
      });
      toast.success('Listing submitted for review!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={styles.page}>
      <div className="container-sm">
        {/* Header */}
        <div style={styles.header}>
          <SectionLabel>AI Parser</SectionLabel>
          <h1 style={styles.title}>Parse a Parking Listing</h1>
          <p style={styles.sub}>
            Paste any informal parking message — WhatsApp, Telegram, DM — and our AI
            extracts structured data instantly.
          </p>
        </div>

        {/* Input */}
        <Card style={styles.inputCard}>
          <div style={styles.inputHeader}>
            <RiWhatsappLine size={18} color="var(--acid)" />
            <span style={styles.inputLabel}>Paste your parking message</span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 'you can park in my compound today, 3 cars, 1500 per hour, available till 9pm...'"
            rows={5}
            style={styles.textarea}
          />

          <div style={styles.charCount}>
            <span style={{ color: text.length > 900 ? 'var(--red)' : 'var(--text-muted)' }}>
              {text.length}/1000
            </span>
          </div>

          {/* Examples */}
          <div style={styles.examplesRow}>
            <span style={styles.examplesLabel}>Try an example:</span>
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => setText(ex)} style={styles.exampleBtn}>
                Example {i + 1}
              </button>
            ))}
          </div>

          <Button
            size="lg" loading={loading}
            onClick={handleExtract}
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
          >
            <RiMagicLine size={17} />
            {loading ? 'Extracting...' : 'Extract Listing Data'}
          </Button>
        </Card>

        {/* Results */}
        {result && (
          <div style={styles.resultWrap} className="animate-fade-up">
            {/* Confidence */}
            <div style={styles.confidenceRow}>
              <span style={styles.confidenceLabel}>AI Confidence</span>
              <ConfidenceBadge level={result.extracted.confidence} />
              {result.extracted.missing_fields?.length > 0 && (
                <span style={styles.missing}>
                  Missing: {result.extracted.missing_fields.join(', ')}
                </span>
              )}
            </div>

            <Card style={styles.resultCard}>
              <h2 style={styles.resultTitle}>Extracted Data</h2>
              <div style={styles.fields}>
                <ExtractField label="Name"       value={result.extracted.name} />
                <ExtractField label="City"       value={result.extracted.city} />
                <ExtractField label="Address"    value={result.extracted.address} />
                <ExtractField label="Capacity"   value={result.extracted.capacity != null ? `${result.extracted.capacity} car(s)` : null} />
                <ExtractField label="Price/hr"   value={result.extracted.price_per_hour != null ? `₦${Number(result.extracted.price_per_hour).toLocaleString()}` : null} />
                <ExtractField label="Negotiable" value={result.extracted.price_is_negotiable ? 'Yes' : 'No'} />
                <ExtractField label="From"       value={result.extracted.available_from} />
                <ExtractField label="Until"      value={result.extracted.available_until} />
                <ExtractField label="Days"       value={result.extracted.available_days?.join(', ')} />
                <ExtractField label="Security"   value={result.extracted.has_security ? '✅ Yes' : '❌ No'} />
                <ExtractField label="Covered"    value={result.extracted.is_covered ? '✅ Yes' : '❌ No'} />
                <ExtractField label="Notes"      value={result.extracted.notes} wide />
              </div>
            </Card>

            <div style={styles.actionRow}>
              <Button
                variant="outline"
                onClick={() => { setResult(null); setText(''); }}
              >
                Clear & Try Again
              </Button>
              <Button
                loading={saving}
                onClick={handleSave}
                style={{ gap: 8 }}
              >
                <RiSaveLine size={16} />
                {saving ? 'Saving...' : 'Save as Listing'}
              </Button>
            </div>

            {!user && (
              <p style={styles.loginHint}>
                <a href="/login" style={{ color: 'var(--acid)' }}>Log in</a> to save this listing to the database.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function ExtractField({ label, value, wide }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ ...fieldStyles.row, ...(wide ? { gridColumn: '1 / -1' } : {}) }}>
      <span style={fieldStyles.label}>{label}</span>
      <span style={fieldStyles.value}>{String(value)}</span>
    </div>
  );
}

function ConfidenceBadge({ level }) {
  const colors = { high: 'var(--green)', medium: 'var(--yellow)', low: 'var(--red)' };
  return (
    <span style={{
      fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.06em', color: colors[level] || 'var(--text-muted)',
    }}>
      {level}
    </span>
  );
}

const styles = {
  page: { padding: '40px 0 80px', minHeight: 'calc(100vh - 60px)' },
  header: { marginBottom: 32 },
  title: {
    fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
    fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12,
  },
  sub: { fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 520 },
  inputCard: { marginBottom: 24 },
  inputHeader: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 },
  inputLabel: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' },
  textarea: {
    resize: 'vertical', minHeight: 110,
    borderRadius: 'var(--radius-md)', lineHeight: 1.6,
    fontSize: '0.9rem', marginBottom: 4,
  },
  charCount: { textAlign: 'right', marginBottom: 12 },
  examplesRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  examplesLabel: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  exampleBtn: {
    padding: '4px 12px', borderRadius: 'var(--radius-pill)',
    background: 'var(--ink-muted)', border: '1px solid var(--border)',
    color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer',
  },
  resultWrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  confidenceRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 16px', borderRadius: 'var(--radius-md)',
    background: 'var(--surface)', border: '1px solid var(--border)',
  },
  confidenceLabel: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  missing: { fontSize: '0.75rem', color: 'var(--yellow)', marginLeft: 'auto' },
  resultCard: {},
  resultTitle: {
    fontFamily: 'var(--font-display)', fontSize: '1rem',
    fontWeight: 700, marginBottom: 16,
  },
  fields: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2,
  },
  actionRow: { display: 'flex', justifyContent: 'flex-end', gap: 12 },
  loginHint: { textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' },
};

const fieldStyles = {
  row: {
    display: 'flex', flexDirection: 'column', gap: 2,
    padding: '10px 12px', borderRadius: 8,
    background: 'var(--ink-soft)',
    margin: 2,
  },
  label: { fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' },
  value: { fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 500 },
};
