import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '', password: '', confirm_password: '',
    first_name: '', tussenvoegsel: '', last_name: '', phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm_password) {
      return setError('Wachtwoorden komen niet overeen');
    }
    if (form.password.length < 8) {
      return setError('Wachtwoord moet minimaal 8 tekens bevatten');
    }
    setLoading(true);
    try {
      await api.post('/auth/register', {
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        tussenvoegsel: form.tussenvoegsel || undefined,
        last_name: form.last_name,
        phone: form.phone || undefined,
      });
      navigate('/confirm');
    } catch (err) {
      setError(err.response?.data?.error || 'Registratie mislukt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-logo">
          <h1>🏢 Bezoekersregistratie</h1>
          <p>Registreer als medewerker</p>
        </div>
        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-row-3">
              <div className="form-group">
                <label>Voornaam *</label>
                <input type="text" value={form.first_name} onChange={set('first_name')} required />
              </div>
              <div className="form-group">
                <label>Tussenvoegsel</label>
                <input type="text" value={form.tussenvoegsel} onChange={set('tussenvoegsel')} placeholder="van" />
              </div>
              <div className="form-group">
                <label>Achternaam *</label>
                <input type="text" value={form.last_name} onChange={set('last_name')} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>E-mailadres *</label>
                <input type="email" value={form.email} onChange={set('email')} required />
              </div>
              <div className="form-group">
                <label>Telefoonnummer</label>
                <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+31 6 12345678" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Wachtwoord *</label>
                <input type="password" value={form.password} onChange={set('password')} required minLength={8} />
              </div>
              <div className="form-group">
                <label>Wachtwoord herhalen *</label>
                <input type="password" value={form.confirm_password} onChange={set('confirm_password')} required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <><span className="spinner" /> Bezig…</> : 'Registreren'}
            </button>
          </form>
        </div>
        <div className="auth-footer">
          Al geregistreerd? <Link to="/login">Inloggen</Link>
        </div>
      </div>
    </div>
  );
}
