import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = { admin: 'Beheerder', receptionist: 'Receptie', employee: 'Medewerker' };

const NAV_LINKS = {
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/users', label: 'Gebruikers' },
    { to: '/admin/config', label: 'Configuratie' },
  ],
  receptionist: [
    { to: '/reception', label: 'Vandaag', end: true },
    { to: '/reception/visitors', label: 'Bezoekers zoeken' },
    { to: '/reception/walkin', label: 'Bezoeker aanmelden' },
  ],
  employee: [
    { to: '/employee', label: 'Mijn bezoekers', end: true },
    { to: '/employee/visitors/new', label: 'Bezoeker aanmelden' },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = user ? NAV_LINKS[user.role] || [] : [];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">🏢 Bezoekersregistratie</NavLink>
      <div className="navbar-nav">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
      {user && (
        <div className="navbar-user">
          <span>{user.full_name || user.email}</span>
          <span className={`badge badge-${user.role}`}>{ROLE_LABELS[user.role]}</span>
          <button className="btn-logout" onClick={handleLogout}>Uitloggen</button>
        </div>
      )}
    </nav>
  );
}
