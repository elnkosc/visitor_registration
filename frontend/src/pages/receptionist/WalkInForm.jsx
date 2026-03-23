import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

export default function WalkInForm() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    first_name: '', tussenvoegsel: '', last_name: '',
    company: '', host_user_id: '',
    expected_date: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [checkinAfter, setCheckinAfter] = useState(false);

  useEffect(() => {
    api.get('/users/employees').then(res => setEmployees(res.data));
  }, []);

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.host_user_id) {
      return setError('Voornaam, achternaam en medewerker zijn verplicht');
    }
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/visitors', form);
      const visitor = res.data;
      if (checkinAfter) {
        await api.post(`/visitors/${visitor.id}/checkin`);
      }
      navigate('/reception');
    } catch (err) {
      setError(err.response?.data?.error || 'Aanmelden mislukt');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bezoeker aanmelden</h1>
          <p className="page-subtitle">Registreer een bezoeker aan de balie</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-row-3">
            <div className="form-group">
              <label>Voornaam *</label>
              <input type="text" value={form.first_name} onChange={set('first_name')} required autoFocus />
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
              <label>Bedrijf</label>
              <input type="text" value={form.company} onChange={set('company')} />
            </div>
            <div className="form-group">
              <label>Datum *</label>
              <input type="date" value={form.expected_date} onChange={set('expected_date')} required />
            </div>
          </div>
          <div className="form-group">
            <label>Voor medewerker *</label>
            <select value={form.host_user_id} onChange={set('host_user_id')} required>
              <option value="">— Selecteer medewerker —</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.full_name}</option>
              ))}
            </select>
          </div>
          {employees.length === 0 && (
            <div className="alert alert-warning">
              Er zijn geen medewerkers geregistreerd. Voeg eerst medewerkers toe via Gebruikersbeheer.
            </div>
          )}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={checkinAfter} onChange={e => setCheckinAfter(e.target.checked)} style={{ width: 'auto' }} />
              Direct inchecken na aanmelden
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" /> Bezig…</> : checkinAfter ? 'Aanmelden & inchecken' : 'Aanmelden'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/reception')}>Annuleren</button>
          </div>
        </form>
      </div>
    </div>
  );
}
