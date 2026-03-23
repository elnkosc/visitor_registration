import { Link } from 'react-router-dom';

export default function ConfirmPage() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>📧</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Controleer uw e-mail</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>
            We hebben een bevestigingslink naar uw e-mailadres gestuurd.<br />
            Klik op de link om uw registratie te voltooien.
          </p>
          <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>
            De link is 24 uur geldig. Controleer ook uw spammap.
          </p>
          <div style={{ marginTop: 24 }}>
            <Link to="/login" className="btn btn-secondary">Terug naar inloggen</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
