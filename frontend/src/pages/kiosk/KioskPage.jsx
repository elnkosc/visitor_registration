import { useState } from 'react';
import api from '../../api';

// ---- Sub-screens ----

function KioskHome({ onCheckin, onCheckout }) {
  return (
    <div className="kiosk-card">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🏢</div>
        <h1 className="kiosk-title">Welkom</h1>
        <p className="kiosk-subtitle">Meld u aan of af bij de receptie</p>
      </div>
      <button className="kiosk-btn kiosk-btn-primary" onClick={onCheckin}>
        ✅ Inchecken — Ik ben gearriveerd
      </button>
      <button className="kiosk-btn kiosk-btn-secondary" onClick={onCheckout}>
        👋 Uitchecken — Ik vertrek
      </button>
    </div>
  );
}

function KioskCheckin({ onBack }) {
  const [step, setStep] = useState('search'); // search | select | details | walkin | done
  const [lastName, setLastName] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ email: '', phone: '', license_plate: '' });
  const [walkinForm, setWalkinForm] = useState({ first_name: '', tussenvoegsel: '', last_name: '', company: '', email: '', phone: '', license_plate: '', host_user_id: '' });
  const [doneMsg, setDoneMsg] = useState({ name: '', host: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (lastName.trim().length < 2) return setError('Voer minimaal 2 tekens in');
    setError('');
    setLoading(true);
    try {
      const res = await api.get(`/kiosk/search?last_name=${encodeURIComponent(lastName)}`);
      if (res.data.length === 0) {
        setError('Geen aangemelde bezoekers gevonden met deze achternaam voor vandaag. Bent u een walk-in bezoeker?');
      } else {
        setResults(res.data);
        setStep('select');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Fout bij zoeken');
    }
    setLoading(false);
  }

  function handleSelect(visitor) {
    setSelected(visitor);
    setStep('details');
  }

  async function handleCheckin(e) {
    e.preventDefault();
    if (!form.phone) return setError('Mobiel nummer is verplicht');
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/kiosk/checkin', { visitor_id: selected.id, ...form });
      setDoneMsg({ name: res.data.full_name, host: res.data.host_name });
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error || 'Inchecken mislukt');
    }
    setLoading(false);
  }

  async function loadEmployees() {
    const res = await api.get('/kiosk/employees');
    setEmployees(res.data);
    setStep('walkin');
  }

  async function handleWalkin(e) {
    e.preventDefault();
    if (!walkinForm.first_name || !walkinForm.last_name || !walkinForm.host_user_id || !walkinForm.phone) {
      return setError('Voornaam, achternaam, medewerker en mobiel nummer zijn verplicht');
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/kiosk/walkin', walkinForm);
      setDoneMsg({ name: res.data.full_name, host: res.data.host_name });
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error || 'Aanmelden mislukt');
    }
    setLoading(false);
  }

  function setWF(field) { return e => setWalkinForm(f => ({ ...f, [field]: e.target.value })); }

  if (step === 'done') {
    return (
      <div className="kiosk-card">
        <div className="kiosk-success">
          <div className="icon">✅</div>
          <h2>Welkom, {doneMsg.name}!</h2>
          <p>Uw komst is gemeld bij <strong>{doneMsg.host}</strong>.<br />Neemt u plaats in de wachtruimte.</p>
          <button className="kiosk-btn kiosk-btn-primary" style={{ marginTop: 32 }} onClick={() => window.location.reload()}>
            Sluiten
          </button>
        </div>
      </div>
    );
  }

  if (step === 'walkin') {
    return (
      <div className="kiosk-card">
        <h2 className="kiosk-title">Walk-in registratie</h2>
        <p className="kiosk-subtitle">Vul uw gegevens in</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleWalkin}>
          <div className="form-row-3">
            <div className="form-group">
              <label>Voornaam *</label>
              <input type="text" value={walkinForm.first_name} onChange={wF => setWalkinForm(f => ({ ...f, first_name: wF.target.value }))} required autoFocus />
            </div>
            <div className="form-group">
              <label>Tussenvoegsel</label>
              <input type="text" value={walkinForm.tussenvoegsel} onChange={wF => setWalkinForm(f => ({ ...f, tussenvoegsel: wF.target.value }))} />
            </div>
            <div className="form-group">
              <label>Achternaam *</label>
              <input type="text" value={walkinForm.last_name} onChange={wF => setWalkinForm(f => ({ ...f, last_name: wF.target.value }))} required />
            </div>
          </div>
          <div className="form-group">
            <label>Bedrijf</label>
            <input type="text" value={walkinForm.company} onChange={wF => setWalkinForm(f => ({ ...f, company: wF.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>E-mailadres</label>
              <input type="email" value={walkinForm.email} onChange={wF => setWalkinForm(f => ({ ...f, email: wF.target.value }))} />
            </div>
            <div className="form-group">
              <label>Mobiel nummer *</label>
              <input type="tel" value={walkinForm.phone} onChange={wF => setWalkinForm(f => ({ ...f, phone: wF.target.value }))} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Kenteken auto</label>
              <input type="text" value={walkinForm.license_plate} onChange={wF => setWalkinForm(f => ({ ...f, license_plate: wF.target.value }))} placeholder="Optioneel" />
            </div>
            <div className="form-group">
              <label>Voor medewerker *</label>
              <select value={walkinForm.host_user_id} onChange={wF => setWalkinForm(f => ({ ...f, host_user_id: wF.target.value }))} required>
                <option value="">— Selecteer —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? <><span className="spinner" /> Bezig…</> : 'Inchecken'}
            </button>
          </div>
        </form>
        <button className="kiosk-back" onClick={() => { setStep('search'); setError(''); }}>← Terug</button>
      </div>
    );
  }

  if (step === 'details') {
    return (
      <div className="kiosk-card">
        <h2 className="kiosk-title">Vul uw gegevens in</h2>
        <p className="kiosk-subtitle">
          <strong>{selected.full_name}</strong> — voor <strong>{selected.host_name}</strong>
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleCheckin}>
          <div className="form-group">
            <label>E-mailadres</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Mobiel nummer *</label>
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} required autoFocus />
          </div>
          <div className="form-group">
            <label>Kenteken auto</label>
            <input type="text" value={form.license_plate} onChange={e => setForm(f => ({ ...f, license_plate: e.target.value }))} placeholder="Optioneel" />
          </div>
          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? <><span className="spinner" /> Bezig…</> : 'Inchecken'}
          </button>
        </form>
        <button className="kiosk-back" onClick={() => { setStep('select'); setError(''); }}>← Terug</button>
      </div>
    );
  }

  if (step === 'select') {
    return (
      <div className="kiosk-card">
        <h2 className="kiosk-title">Wie bent u?</h2>
        <p className="kiosk-subtitle">Selecteer uzelf uit de lijst</p>
        <div className="visitor-list">
          {results.map(v => (
            <button key={v.id} className="visitor-option" onClick={() => handleSelect(v)}>
              <div className="name">{v.full_name}</div>
              <div className="detail">
                {v.company ? `${v.company} — ` : ''}voor {v.host_name}
              </div>
            </button>
          ))}
        </div>
        <div className="divider" />
        <button className="kiosk-btn kiosk-btn-secondary" onClick={loadEmployees}>
          Ik sta er niet bij (walk-in)
        </button>
        <button className="kiosk-back" onClick={() => { setStep('search'); setError(''); }}>← Terug</button>
      </div>
    );
  }

  // Default: search screen
  return (
    <div className="kiosk-card">
      <h2 className="kiosk-title">Inchecken</h2>
      <p className="kiosk-subtitle">Voer uw achternaam in om uzelf te zoeken</p>
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      <form onSubmit={handleSearch}>
        <div className="form-group">
          <label style={{ fontSize: 16 }}>Achternaam</label>
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            style={{ fontSize: 20, padding: '14px 16px' }}
            autoFocus
            required
          />
        </div>
        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
          {loading ? <><span className="spinner" /> Zoeken…</> : 'Zoeken'}
        </button>
      </form>
      <div className="divider" />
      <button className="kiosk-btn kiosk-btn-secondary" onClick={loadEmployees}>
        Walk-in — Ik ben niet aangemeld
      </button>
      <button className="kiosk-back" onClick={onBack}>← Terug</button>
    </div>
  );
}

function KioskCheckout({ onBack }) {
  const [step, setStep] = useState('search');
  const [lastName, setLastName] = useState('');
  const [results, setResults] = useState([]);
  const [doneMsg, setDoneMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (lastName.trim().length < 2) return setError('Voer minimaal 2 tekens in');
    setError('');
    setLoading(true);
    try {
      const res = await api.get(`/kiosk/search-checkedin?last_name=${encodeURIComponent(lastName)}`);
      if (res.data.length === 0) {
        setError('Geen ingecheckte bezoekers gevonden met deze achternaam.');
      } else {
        setResults(res.data);
        setStep('select');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Fout bij zoeken');
    }
    setLoading(false);
  }

  async function handleCheckout(visitor) {
    setLoading(true);
    try {
      await api.post('/kiosk/checkout', { visitor_id: visitor.id });
      setDoneMsg(visitor.full_name);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error || 'Uitchecken mislukt');
    }
    setLoading(false);
  }

  if (step === 'done') {
    return (
      <div className="kiosk-card">
        <div className="kiosk-success">
          <div className="icon">👋</div>
          <h2>Tot ziens, {doneMsg}!</h2>
          <p>U bent succesvol uitgecheckt. Bedankt voor uw bezoek.</p>
          <button className="kiosk-btn kiosk-btn-primary" style={{ marginTop: 32 }} onClick={() => window.location.reload()}>
            Sluiten
          </button>
        </div>
      </div>
    );
  }

  if (step === 'select') {
    return (
      <div className="kiosk-card">
        <h2 className="kiosk-title">Wie bent u?</h2>
        <p className="kiosk-subtitle">Selecteer uzelf om uit te checken</p>
        <div className="visitor-list">
          {results.map(v => (
            <button key={v.id} className="visitor-option" onClick={() => handleCheckout(v)} disabled={loading}>
              <div className="name">{v.full_name}</div>
              <div className="detail">
                {v.company ? `${v.company} — ` : ''}voor {v.host_name}
              </div>
            </button>
          ))}
        </div>
        {error && <div className="alert alert-error mt-1">{error}</div>}
        <button className="kiosk-back" onClick={() => { setStep('search'); setError(''); }}>← Terug</button>
      </div>
    );
  }

  return (
    <div className="kiosk-card">
      <h2 className="kiosk-title">Uitchecken</h2>
      <p className="kiosk-subtitle">Voer uw achternaam in</p>
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      <form onSubmit={handleSearch}>
        <div className="form-group">
          <label style={{ fontSize: 16 }}>Achternaam</label>
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            style={{ fontSize: 20, padding: '14px 16px' }}
            autoFocus
            required
          />
        </div>
        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
          {loading ? <><span className="spinner" /> Zoeken…</> : 'Zoeken'}
        </button>
      </form>
      <button className="kiosk-back" onClick={onBack}>← Terug</button>
    </div>
  );
}

// ---- Main Kiosk Page ----

export default function KioskPage() {
  const [screen, setScreen] = useState('home'); // home | checkin | checkout

  return (
    <div className="kiosk-page">
      <div style={{ position: 'absolute', top: 16, right: 24, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
        {new Date().toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>

      {screen === 'home' && (
        <KioskHome
          onCheckin={() => setScreen('checkin')}
          onCheckout={() => setScreen('checkout')}
        />
      )}
      {screen === 'checkin' && (
        <KioskCheckin onBack={() => setScreen('home')} />
      )}
      {screen === 'checkout' && (
        <KioskCheckout onBack={() => setScreen('home')} />
      )}
    </div>
  );
}
