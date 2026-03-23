import { useEffect, useState } from 'react';
import api from '../../api';

export default function ConfigPage() {
  const [config, setConfig] = useState(null);
  const [domains, setDomains] = useState([]);
  const [newDomain, setNewDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/config').then(res => {
      setConfig(res.data);
      setDomains(res.data.allowed_domains_parsed || []);
    });
  }, []);

  function setField(key) {
    return e => setConfig(c => ({ ...c, [key]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.put('/config', {
        smtp_host: config.smtp_host,
        smtp_port: config.smtp_port,
        smtp_secure: config.smtp_secure,
        smtp_user: config.smtp_user,
        smtp_pass: config.smtp_pass,
        smtp_from: config.smtp_from,
        company_name: config.company_name,
      });
      await api.put('/config/domains', { domains });
      setMessage('Configuratie opgeslagen');
    } catch (err) {
      setError(err.response?.data?.error || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    setTesting(true);
    setMessage('');
    setError('');
    try {
      const res = await api.post('/config/smtp/test');
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Test mislukt');
    } finally {
      setTesting(false);
    }
  }

  function addDomain() {
    const d = newDomain.trim().toLowerCase();
    if (!d) return;
    if (domains.includes(d)) return;
    setDomains(prev => [...prev, d]);
    setNewDomain('');
  }

  function removeDomain(d) {
    setDomains(prev => prev.filter(x => x !== d));
  }

  if (!config) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuratie</h1>
          <p className="page-subtitle">SMTP instellingen en toegelaten e-maildomeinen</p>
        </div>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="card-title">Bedrijfsinformatie</h2>
        <div className="form-group" style={{ maxWidth: 400 }}>
          <label>Bedrijfsnaam</label>
          <input type="text" value={config.company_name || ''} onChange={setField('company_name')} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="card-title">SMTP E-mailinstellingen</h2>
        <div className="form-row">
          <div className="form-group">
            <label>SMTP Server</label>
            <input type="text" value={config.smtp_host || ''} onChange={setField('smtp_host')} placeholder="smtp.example.com" />
          </div>
          <div className="form-group">
            <label>Poortnummer</label>
            <input type="text" value={config.smtp_port || ''} onChange={setField('smtp_port')} placeholder="587" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Gebruikersnaam</label>
            <input type="text" value={config.smtp_user || ''} onChange={setField('smtp_user')} placeholder="noreply@example.com" />
          </div>
          <div className="form-group">
            <label>Wachtwoord</label>
            <input type="password" value={config.smtp_pass || ''} onChange={setField('smtp_pass')} placeholder="Wachtwoord (leeg = niet wijzigen)" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Afzender e-mailadres</label>
            <input type="email" value={config.smtp_from || ''} onChange={setField('smtp_from')} placeholder="noreply@example.com" />
          </div>
          <div className="form-group">
            <label>Beveiliging</label>
            <select value={config.smtp_secure || 'false'} onChange={setField('smtp_secure')}>
              <option value="false">STARTTLS (poort 587)</option>
              <option value="true">SSL/TLS (poort 465)</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={handleTestEmail} disabled={testing}>
            {testing ? <><span className="spinner" /> Bezig…</> : '📧 Test e-mail sturen'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="card-title">Toegelaten e-maildomeinen</h2>
        <p className="text-muted text-small" style={{ marginBottom: 16 }}>
          Alleen medewerkers met een e-mailadres van deze domeinen kunnen zich zelf registreren.
          Laat leeg om alle domeinen toe te staan.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addDomain()}
            placeholder="example.com"
            style={{ flex: 1 }}
          />
          <button className="btn btn-secondary" onClick={addDomain}>Toevoegen</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {domains.length === 0 ? (
            <p className="text-muted text-small">Geen domeinen geconfigureerd (iedereen kan zich registreren)</p>
          ) : domains.map(d => (
            <span key={d} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'var(--primary-light)', color: 'var(--primary)',
              padding: '4px 10px', borderRadius: 999, fontSize: 13, fontWeight: 500,
            }}>
              @{d}
              <button onClick={() => removeDomain(d)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 16, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner" /> Opslaan…</> : 'Configuratie opslaan'}
        </button>
      </div>
    </div>
  );
}
