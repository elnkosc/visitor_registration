import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

export default function VisitorForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    first_name: '', tussenvoegsel: '', last_name: '',
    company: '', expected_date: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      api.get(`/visitors/${id}`).then(res => {
        const v = res.data;
        setForm({
          first_name: v.first_name || '',
          tussenvoegsel: v.tussenvoegsel || '',
          last_name: v.last_name || '',
          company: v.company || '',
          expected_date: v.expected_date || '',
        });
        setLoading(false);
      }).catch(() => navigate('/employee'));
    }
  }, [id]);

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.expected_date) {
      return setError('Voornaam, achternaam en datum zijn verplicht');
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.put(`/visitors/${id}`, form);
      } else {
        await api.post('/visitors', form);
      }
      navigate('/employee');
    } catch (err) {
      setError(err.response?.data?.error || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Bezoeker bewerken' : 'Bezoeker aanmelden'}</h1>
          <p className="page-subtitle">
            {isEdit ? 'Wijzig de gegevens van uw bezoeker' : 'Meld een nieuwe bezoeker aan'}
          </p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
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
              <input type="text" value={form.company} onChange={set('company')} placeholder="Optioneel" />
            </div>
            <div className="form-group">
              <label>Datum bezoek *</label>
              <input type="date" value={form.expected_date} onChange={set('expected_date')} required />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" /> Opslaan…</> : isEdit ? 'Wijzigingen opslaan' : 'Bezoeker aanmelden'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/employee')}>Annuleren</button>
          </div>
        </form>
        {!isEdit && (
          <div className="alert alert-info mt-2" style={{ marginTop: 20 }}>
            U ontvangt een e-mailbevestiging na het aanmelden.
          </div>
        )}
      </div>
    </div>
  );
}
