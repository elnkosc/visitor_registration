import { useEffect, useState } from 'react';
import api from '../../api';

const ROLES = { admin: 'Beheerder', receptionist: 'Receptie', employee: 'Medewerker' };

function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({
    email: user?.email || '',
    first_name: user?.first_name || '',
    tussenvoegsel: user?.tussenvoegsel || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    role: user?.role || 'employee',
    is_active: user ? user.is_active === 1 : true,
    password: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleSave() {
    if (!form.email || !form.first_name || !form.last_name) {
      return setError('E-mail, voornaam en achternaam zijn verplicht');
    }
    setSaving(true);
    setError('');
    try {
      const data = { ...form, is_active: form.is_active ? 1 : 0 };
      if (!data.password) delete data.password;
      if (user) {
        await api.put(`/users/${user.id}`, data);
      } else {
        if (!form.password) return setError('Wachtwoord is verplicht voor nieuwe gebruikers');
        await api.post('/users', data);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{user ? 'Gebruiker bewerken' : 'Nieuwe gebruiker'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-row-3">
            <div className="form-group">
              <label>Voornaam *</label>
              <input type="text" value={form.first_name} onChange={set('first_name')} />
            </div>
            <div className="form-group">
              <label>Tussenvoegsel</label>
              <input type="text" value={form.tussenvoegsel} onChange={set('tussenvoegsel')} />
            </div>
            <div className="form-group">
              <label>Achternaam *</label>
              <input type="text" value={form.last_name} onChange={set('last_name')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>E-mailadres *</label>
              <input type="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="form-group">
              <label>Telefoonnummer</label>
              <input type="tel" value={form.phone} onChange={set('phone')} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Rol *</label>
              <select value={form.role} onChange={set('role')}>
                <option value="admin">Beheerder</option>
                <option value="receptionist">Receptie</option>
                <option value="employee">Medewerker</option>
              </select>
            </div>
            <div className="form-group">
              <label>Wachtwoord {user ? '(leeg = niet wijzigen)' : '*'}</label>
              <input type="password" value={form.password} onChange={set('password')} placeholder={user ? 'Nieuw wachtwoord' : ''} />
            </div>
          </div>
          {user && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width: 'auto' }} />
                Account actief
              </label>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuleren</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner" /> Opslaan…</> : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}

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

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [message, setMessage] = useState('');

  async function loadUsers() {
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await api.get('/users', { params });
      setUsers(res.data);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, [search, roleFilter]);

  async function handleDelete() {
    try {
      await api.delete(`/users/${deleteUser.id}`);
      setMessage('Gebruiker verwijderd');
      setDeleteUser(null);
      loadUsers();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Verwijderen mislukt');
    }
  }

  function handleSaved() {
    setEditUser(null);
    setShowNew(false);
    setMessage('Gebruiker opgeslagen');
    loadUsers();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gebruikers</h1>
          <p className="page-subtitle">Beheer alle gebruikers van het systeem</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ Nieuwe gebruiker</button>
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      <div className="card">
        <div className="search-bar">
          <input className="search-input" type="text" placeholder="Zoeken op naam of e-mail…" value={search} onChange={e => setSearch(e.target.value)} />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width: 160 }}>
            <option value="">Alle rollen</option>
            <option value="admin">Beheerder</option>
            <option value="receptionist">Receptie</option>
            <option value="employee">Medewerker</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : users.length === 0 ? (
          <div className="empty-state"><div className="icon">👥</div><p>Geen gebruikers gevonden</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Naam</th>
                  <th>E-mail</th>
                  <th>Telefoon</th>
                  <th>Rol</th>
                  <th>Status</th>
                  <th>Acties</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.full_name || '—'}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    <td><span className={`badge badge-${u.role}`}>{ROLES[u.role]}</span></td>
                    <td>
                      <span className={`badge ${u.is_active === 1 ? 'badge-active' : u.is_active === 0 ? 'badge-inactive' : 'badge-cancelled'}`}>
                        {u.is_active === 1 ? 'Actief' : u.is_active === 0 ? 'Onbevestigd' : 'Verwijderd'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-col">
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditUser(u)}>Bewerken</button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteUser(u)}>Verwijderen</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showNew || editUser) && (
        <UserModal user={editUser} onClose={() => { setEditUser(null); setShowNew(false); }} onSave={handleSaved} />
      )}
      {deleteUser && (
        <ConfirmDialog
          message={`Gebruiker "${deleteUser.full_name || deleteUser.email}" verwijderen?`}
          onConfirm={handleDelete}
          onClose={() => setDeleteUser(null)}
        />
      )}
    </div>
  );
}
