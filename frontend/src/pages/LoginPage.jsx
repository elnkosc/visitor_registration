import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const confirmed = params.get('confirmed');
  const tokenError = params.get('error');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'receptionist') navigate('/reception');
      else navigate('/employee');
    } catch (err) {
      setError(err.response?.data?.error || 'Inloggen mislukt');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>🏢 Bezoekersregistratie</h1>
          <p>Log in om verder te gaan</p>
        </div>
        <div className="card">
          {confirmed && (
            <div className="alert alert-success">E-mailadres bevestigd! U kunt nu inloggen.</div>
          )}
          {tokenError === 'token_expired' && (
            <div className="alert alert-error">Bevestigingslink verlopen. Registreer opnieuw.</div>
          )}
          {tokenError === 'invalid_token' && (
            <div className="alert alert-error">Ongeldige bevestigingslink.</div>
          )}
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>E-mailadres</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label>Wachtwoord</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? <><span className="spinner" /> Bezig…</> : 'Inloggen'}
            </button>
          </form>
        </div>
        <div className="auth-footer">
          Medewerker? <Link to="/register">Registreer u hier</Link>
        </div>
      </div>
    </div>
  );
}
