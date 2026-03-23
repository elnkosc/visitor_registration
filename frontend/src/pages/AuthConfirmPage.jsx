import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

export default function AuthConfirmPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    // The backend does a redirect, but we handle it via the API as well
    // Direct redirect to backend confirm endpoint
    window.location.href = `${import.meta.env.VITE_API_URL || '/api'}/auth/confirm/${token}`;
  }, [token]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px', borderWidth: 3 }} />
          <p>Bezig met bevestigen…</p>
        </div>
      </div>
    </div>
  );
}
