import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';

const STATUS_LABELS = { planned: 'Verwacht', checked_in: 'Aanwezig', checked_out: 'Vertrokken' };

function duration(checkin, checkout) {
  if (!checkin) return '—';
  const end = checkout ? checkout * 1000 : Date.now();
  const mins = Math.round((end - checkin * 1000) / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}u ${mins % 60}m`;
}

export default function ReceptionDashboard() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  async function loadToday() {
    setLoading(true);
    try {
      const res = await api.get('/visitors/today');
      setVisitors(res.data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadToday(); }, []);

  async function handleCheckin(id) {
    setActionLoading(id);
    try {
      await api.post(`/visitors/${id}/checkin`);
      setMessage('Bezoeker ingecheckt');
      loadToday();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Fout bij inchecken');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCheckout(id) {
    setActionLoading(id);
    try {
      await api.post(`/visitors/${id}/checkout`);
      setMessage('Bezoeker uitgecheckt');
      loadToday();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Fout bij uitchecken');
    } finally {
      setActionLoading(null);
    }
  }

  const today = new Date().toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const planned = visitors.filter(v => v.status === 'planned');
  const checkedIn = visitors.filter(v => v.status === 'checked_in');
  const checkedOut = visitors.filter(v => v.status === 'checked_out');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Receptie — Vandaag</h1>
          <p className="page-subtitle">{today}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/reception/walkin" className="btn btn-primary">+ Bezoeker aanmelden</Link>
          <button className="btn btn-secondary" onClick={loadToday}>↻ Vernieuwen</button>
        </div>
      </div>

      {message && <div className="alert alert-info" style={{ cursor: 'pointer' }} onClick={() => setMessage('')}>{message} ×</div>}

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{visitors.length}</div>
          <div className="stat-label">Totaal vandaag</div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-value">{planned.length}</div>
          <div className="stat-label">Verwacht</div>
        </div>
        <div className="stat-card stat-success">
          <div className="stat-value">{checkedIn.length}</div>
          <div className="stat-label">Aanwezig</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{checkedOut.length}</div>
          <div className="stat-label">Vertrokken</div>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : visitors.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>Geen bezoekers voor vandaag geregistreerd</p>
            <div className="mt-2">
              <Link to="/reception/walkin" className="btn btn-primary">Bezoeker aanmelden</Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Bedrijf</th>
                  <th>Voor medewerker</th>
                  <th>Status</th>
                  <th>Ingecheckt</th>
                  <th>Verblijfsduur</th>
                  <th>Acties</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map(v => (
                  <tr key={v.id}>
                    <td><strong>{v.full_name}</strong></td>
                    <td>{v.company || '—'}</td>
                    <td>{v.host_name || '—'}</td>
                    <td><span className={`badge badge-${v.status}`}>{STATUS_LABELS[v.status]}</span></td>
                    <td>{v.checked_in_at ? new Date(v.checked_in_at * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="duration">{duration(v.checked_in_at, v.checked_out_at)}</td>
                    <td>
                      <div className="actions-col">
                        {v.status === 'planned' && (
                          <button className="btn btn-success btn-sm" onClick={() => handleCheckin(v.id)} disabled={actionLoading === v.id}>
                            Inchecken
                          </button>
                        )}
                        {v.status === 'checked_in' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleCheckout(v.id)} disabled={actionLoading === v.id}>
                            Uitchecken
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
