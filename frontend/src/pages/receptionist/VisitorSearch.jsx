import { useEffect, useState } from 'react';
import api from '../../api';

const STATUS_LABELS = { planned: 'Verwacht', checked_in: 'Aanwezig', checked_out: 'Vertrokken', cancelled: 'Geannuleerd' };

function duration(checkin, checkout) {
  if (!checkin || !checkout) return '—';
  const mins = Math.round((checkout - checkin) / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}u ${mins % 60}m`;
}

export default function VisitorSearch() {
  const [visitors, setVisitors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const LIMIT = 25;

  async function load(p = page) {
    setLoading(true);
    try {
      const params = { page: p, limit: LIMIT };
      if (search) params.search = search;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (status) params.status = status;
      const res = await api.get('/visitors', { params });
      setVisitors(res.data.data);
      setTotal(res.data.total);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(1); setPage(1); }, [search, dateFrom, dateTo, status]);

  async function handleCheckin(id) {
    setActionLoading(id);
    try {
      await api.post(`/visitors/${id}/checkin`);
      setMessage('Ingecheckt');
      load();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Fout');
    }
    setActionLoading(null);
  }

  async function handleCheckout(id) {
    setActionLoading(id);
    try {
      await api.post(`/visitors/${id}/checkout`);
      setMessage('Uitgecheckt');
      load();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Fout');
    }
    setActionLoading(null);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bezoekers zoeken</h1>
          <p className="page-subtitle">{total} resultaten</p>
        </div>
      </div>

      {message && <div className="alert alert-info" style={{ cursor: 'pointer' }} onClick={() => setMessage('')}>{message} ×</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="search-bar">
          <input className="search-input" type="text" placeholder="Zoek op naam of bedrijf…" value={search} onChange={e => setSearch(e.target.value)} />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Datum van" style={{ width: 150 }} />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="Datum tot" style={{ width: 150 }} />
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: 160 }}>
            <option value="">Alle statussen</option>
            <option value="planned">Verwacht</option>
            <option value="checked_in">Aanwezig</option>
            <option value="checked_out">Vertrokken</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : visitors.length === 0 ? (
          <div className="empty-state"><div className="icon">🔍</div><p>Geen bezoekers gevonden</p></div>
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Naam</th>
                    <th>Bedrijf</th>
                    <th>Voor medewerker</th>
                    <th>Datum</th>
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
                      <td>{v.expected_date}</td>
                      <td><span className={`badge badge-${v.status}`}>{STATUS_LABELS[v.status]}</span></td>
                      <td>{v.checked_in_at ? new Date(v.checked_in_at * 1000).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="duration">{duration(v.checked_in_at, v.checked_out_at)}</td>
                      <td>
                        <div className="actions-col">
                          {v.status === 'planned' && (
                            <button className="btn btn-success btn-sm" onClick={() => handleCheckin(v.id)} disabled={actionLoading === v.id}>Inchecken</button>
                          )}
                          {v.status === 'checked_in' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleCheckout(v.id)} disabled={actionLoading === v.id}>Uitchecken</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex gap-2 items-center mt-2" style={{ justifyContent: 'center' }}>
                <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => { setPage(p => p - 1); load(page - 1); }}>← Vorige</button>
                <span className="text-muted text-small">Pagina {page} van {totalPages}</span>
                <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => { setPage(p => p + 1); load(page + 1); }}>Volgende →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
