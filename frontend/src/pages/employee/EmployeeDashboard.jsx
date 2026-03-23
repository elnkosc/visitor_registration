import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';

const STATUS_LABELS = { planned: 'Verwacht', checked_in: 'Aanwezig', checked_out: 'Vertrokken', cancelled: 'Geannuleerd' };

function ConfirmDialog({ message, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2 className="modal-title">Bevestigen</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body"><p>{message}</p></div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuleren</button>
          <button className="btn btn-danger" onClick={onConfirm}>Verwijderen</button>
        </div>
      </div>
    </div>
  );
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [deleteVisitor, setDeleteVisitor] = useState(null);
  const [message, setMessage] = useState('');

  async function loadVisitors() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const params = { limit: 50 };
      if (filter === 'upcoming') params.date_from = today;
      else if (filter === 'past') params.date_to = today;
      const res = await api.get('/visitors', { params });
      setVisitors(res.data.data);
      setTotal(res.data.total);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadVisitors(); }, [filter]);

  async function handleDelete() {
    try {
      await api.delete(`/visitors/${deleteVisitor.id}`);
      setMessage('Bezoeker geannuleerd');
      setDeleteVisitor(null);
      loadVisitors();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Verwijderen mislukt');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mijn bezoekers</h1>
          <p className="page-subtitle">{total} bezoekers</p>
        </div>
        <Link to="/employee/visitors/new" className="btn btn-primary">+ Bezoeker aanmelden</Link>
      </div>

      {message && <div className="alert alert-info" style={{ cursor: 'pointer' }} onClick={() => setMessage('')}>{message} ×</div>}

      <div className="flex gap-2 mb-2">
        {[
          { value: 'upcoming', label: 'Aankomend' },
          { value: 'past', label: 'Verleden' },
          { value: 'all', label: 'Alles' },
        ].map(opt => (
          <button
            key={opt.value}
            className={`btn ${filter === opt.value ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : visitors.length === 0 ? (
          <div className="empty-state">
            <div className="icon">👤</div>
            <p>Geen bezoekers gevonden</p>
            <div className="mt-2">
              <Link to="/employee/visitors/new" className="btn btn-primary">Bezoeker aanmelden</Link>
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>Bedrijf</th>
                  <th>Datum</th>
                  <th>Status</th>
                  <th>Acties</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map(v => (
                  <tr key={v.id}>
                    <td><strong>{v.full_name}</strong></td>
                    <td>{v.company || '—'}</td>
                    <td>{v.expected_date}</td>
                    <td><span className={`badge badge-${v.status}`}>{STATUS_LABELS[v.status]}</span></td>
                    <td>
                      <div className="actions-col">
                        {v.status === 'planned' && (
                          <>
                            <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/employee/visitors/${v.id}/edit`)}>Bewerken</button>
                            <button className="btn btn-danger btn-sm" onClick={() => setDeleteVisitor(v)}>Annuleren</button>
                          </>
                        )}
                        {v.status === 'cancelled' && <span className="text-muted text-small">Geannuleerd</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteVisitor && (
        <ConfirmDialog
          message={`Aanmelding van "${deleteVisitor.full_name}" annuleren?`}
          onConfirm={handleDelete}
          onClose={() => setDeleteVisitor(null)}
        />
      )}
    </div>
  );
}
