import { useEffect, useState } from 'react';
import api from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [usersRes, visitorsRes, todayRes] = await Promise.all([
          api.get('/users'),
          api.get('/visitors?limit=1'),
          api.get('/visitors/today'),
        ]);
        const users = usersRes.data;
        setStats({
          total_users: users.length,
          employees: users.filter(u => u.role === 'employee').length,
          active_users: users.filter(u => u.is_active === 1).length,
          today_total: todayRes.data.length,
          today_checkedin: todayRes.data.filter(v => v.status === 'checked_in').length,
          today_planned: todayRes.data.filter(v => v.status === 'planned').length,
          total_visitors: visitorsRes.data.total,
        });
      } catch {
        setStats({});
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{new Date().toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 12 }}>Vandaag</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.today_total ?? '—'}</div>
          <div className="stat-label">Bezoekers verwacht / aanwezig</div>
        </div>
        <div className="stat-card stat-success">
          <div className="stat-value">{stats?.today_checkedin ?? '—'}</div>
          <div className="stat-label">Ingecheckt</div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-value">{stats?.today_planned ?? '—'}</div>
          <div className="stat-label">Nog niet gearriveerd</div>
        </div>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 12, marginTop: 24 }}>Gebruikers</h2>
      <div className="stats-grid">
        <div className="stat-card stat-primary">
          <div className="stat-value">{stats?.total_users ?? '—'}</div>
          <div className="stat-label">Totaal gebruikers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.employees ?? '—'}</div>
          <div className="stat-label">Medewerkers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.total_visitors ?? '—'}</div>
          <div className="stat-label">Totaal bezoekers (ooit)</div>
        </div>
      </div>
    </div>
  );
}
