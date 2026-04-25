import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Button, Field, SectionLabel } from '../components/ui/UIKit';
import toast from 'react-hot-toast';

// ── Login ─────────────────────────────────────────────────────
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/find');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return <AuthLayout title="Welcome Back" sub="Log in to your Park Naija AI account.">
    <form onSubmit={handleSubmit} style={styles.form}>
      <Field label="Email" required>
        <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
      </Field>
      <Field label="Password" required>
        <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" autoComplete="current-password" />
      </Field>
      <Button type="submit" size="lg" loading={loading} style={{ width: '100%', justifyContent: 'center' }}>
        {loading ? 'Logging in...' : 'Log In'}
      </Button>
    </form>
    <p style={styles.switchText}>
      Don't have an account? <Link to="/register" style={styles.switchLink}>Sign Up</Link>
    </p>
  </AuthLayout>;
}

// ── Register ──────────────────────────────────────────────────
export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '', email: '', phone_number: '',
    role: 'driver', city: 'lagos', password: '', confirm: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 8)       return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await authAPI.register({
        full_name:    form.full_name,
        email:        form.email,
        phone_number: form.phone_number,
        role:         form.role,
        city:         form.city,
        password:     form.password,
      });
      toast.success('Account created! Please log in.');
      navigate('/login');
    } catch (err) {
      const data = err.response?.data;
      const msg = typeof data === 'object' ? Object.values(data).flat().join(' ') : 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return <AuthLayout title="Create Account" sub="Join Park Naija AI — find or list parking in minutes.">
    <form onSubmit={handleSubmit} style={styles.form}>
      <Field label="Full Name" required>
        <input value={form.full_name} onChange={set('full_name')} placeholder="Chukwuemeka Obi" />
      </Field>
      <Field label="Email" required>
        <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
      </Field>
      <Field label="Phone Number" hint="Optional — useful for space owners">
        <input type="tel" value={form.phone_number} onChange={set('phone_number')} placeholder="080xxxxxxxx" />
      </Field>
      <div style={styles.row2}>
        <Field label="I am a...">
          <select value={form.role} onChange={set('role')}>
            <option value="driver">Driver</option>
            <option value="space_owner">Space Owner</option>
          </select>
        </Field>
        <Field label="Primary City">
          <select value={form.city} onChange={set('city')}>
            <option value="lagos">Lagos</option>
            <option value="port_harcourt">Port Harcourt</option>
            <option value="abuja">Abuja</option>
          </select>
        </Field>
      </div>
      <Field label="Password" required hint="Minimum 8 characters">
        <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
      </Field>
      <Field label="Confirm Password" required>
        <input type="password" value={form.confirm} onChange={set('confirm')} placeholder="••••••••" />
      </Field>
      <Button type="submit" size="lg" loading={loading} style={{ width: '100%', justifyContent: 'center' }}>
        {loading ? 'Creating account...' : 'Create Account'}
      </Button>
    </form>
    <p style={styles.switchText}>
      Already have an account? <Link to="/login" style={styles.switchLink}>Log In</Link>
    </p>
  </AuthLayout>;
}

// ── Shared Layout ─────────────────────────────────────────────
function AuthLayout({ title, sub, children }) {
  return (
    <main style={layout.page}>
      <div style={layout.card}>
        <div style={layout.top}>
          <SectionLabel>Park Naija AI</SectionLabel>
          <h1 style={layout.title}>{title}</h1>
          <p style={layout.sub}>{sub}</p>
        </div>
        {children}
      </div>
    </main>
  );
}

const styles = {
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  switchText: { textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 16 },
  switchLink: { color: 'var(--acid)', fontWeight: 600 },
};

const layout = {
  page: {
    minHeight: 'calc(100vh - 60px)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    padding: '40px 16px',
  },
  card: {
    width: '100%', maxWidth: 440,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)', padding: 36,
  },
  top: { marginBottom: 28 },
  title: {
    fontFamily: 'var(--font-display)', fontSize: '1.8rem',
    fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8,
  },
  sub: { fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 },
};

export default LoginPage;
