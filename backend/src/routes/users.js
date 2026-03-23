const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { db, fullName } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

function safeUser(u) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    first_name: u.first_name,
    tussenvoegsel: u.tussenvoegsel,
    last_name: u.last_name,
    phone: u.phone,
    is_active: u.is_active,
    full_name: fullName(u),
    created_at: u.created_at,
  };
}

// GET /api/users  (admin only)
router.get('/', authenticate, authorize('admin'), (req, res) => {
  const { role, search, active } = req.query;
  let query = 'SELECT * FROM users WHERE 1=1';
  const params = [];

  if (role) { query += ' AND role = ?'; params.push(role); }
  if (active !== undefined) { query += ' AND is_active = ?'; params.push(Number(active)); }
  if (search) {
    query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  query += ' ORDER BY last_name, first_name';

  const users = db.prepare(query).all(...params);
  res.json(users.map(safeUser));
});

// GET /api/users/employees  (receptionist + admin: for dropdown)
router.get('/employees', authenticate, authorize('admin', 'receptionist'), (req, res) => {
  const users = db.prepare(
    "SELECT * FROM users WHERE role = 'employee' AND is_active = 1 ORDER BY last_name, first_name"
  ).all();
  res.json(users.map(safeUser));
});

// GET /api/users/me
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Niet gevonden' });
  res.json(safeUser(user));
});

// PUT /api/users/me  (update own profile)
router.put('/me', authenticate, async (req, res) => {
  const { first_name, tussenvoegsel, last_name, phone, current_password, new_password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Niet gevonden' });

  const updates = {};
  if (first_name !== undefined) updates.first_name = first_name.trim();
  if (tussenvoegsel !== undefined) updates.tussenvoegsel = tussenvoegsel?.trim() || null;
  if (last_name !== undefined) updates.last_name = last_name.trim();
  if (phone !== undefined) updates.phone = phone?.trim() || null;

  if (new_password) {
    if (!current_password) return res.status(400).json({ error: 'Huidig wachtwoord is verplicht' });
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Huidig wachtwoord is onjuist' });
    updates.password_hash = await bcrypt.hash(new_password, 12);
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Geen wijzigingen' });

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE users SET ${setClauses}, updated_at = unixepoch() WHERE id = ?`)
    .run(...Object.values(updates), req.user.id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json(safeUser(updated));
});

// GET /api/users/:id  (admin only)
router.get('/:id', authenticate, authorize('admin'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Niet gevonden' });
  res.json(safeUser(user));
});

// POST /api/users  (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { email, password, role, first_name, tussenvoegsel, last_name, phone } = req.body;
  if (!email || !role || !first_name || !last_name) {
    return res.status(400).json({ error: 'E-mail, rol, voornaam en achternaam zijn verplicht' });
  }
  if (!['admin', 'receptionist', 'employee'].includes(role)) {
    return res.status(400).json({ error: 'Ongeldige rol' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) return res.status(409).json({ error: 'E-mailadres is al in gebruik' });

  const hash = password ? await bcrypt.hash(password, 12) : null;

  db.prepare(`
    INSERT INTO users (email, password_hash, role, first_name, tussenvoegsel, last_name, phone, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(normalizedEmail, hash, role, first_name.trim(), tussenvoegsel?.trim() || null, last_name.trim(), phone?.trim() || null);

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  res.status(201).json(safeUser(user));
});

// PUT /api/users/:id  (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { email, role, first_name, tussenvoegsel, last_name, phone, is_active, password } = req.body;
  const userId = parseInt(req.params.id, 10);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'Niet gevonden' });

  // Prevent removing own admin role
  if (userId === req.user.id && role && role !== 'admin') {
    return res.status(400).json({ error: 'U kunt uw eigen beheerdersrol niet wijzigen' });
  }

  const updates = {};
  if (email !== undefined) {
    const normalized = email.toLowerCase().trim();
    if (normalized !== user.email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(normalized, userId);
      if (existing) return res.status(409).json({ error: 'E-mailadres is al in gebruik' });
      updates.email = normalized;
    }
  }
  if (role !== undefined) updates.role = role;
  if (first_name !== undefined) updates.first_name = first_name.trim();
  if (tussenvoegsel !== undefined) updates.tussenvoegsel = tussenvoegsel?.trim() || null;
  if (last_name !== undefined) updates.last_name = last_name.trim();
  if (phone !== undefined) updates.phone = phone?.trim() || null;
  if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;
  if (password) updates.password_hash = await bcrypt.hash(password, 12);

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Geen wijzigingen' });

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE users SET ${setClauses}, updated_at = unixepoch() WHERE id = ?`)
    .run(...Object.values(updates), userId);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.json(safeUser(updated));
});

// DELETE /api/users/:id  (admin only, cannot delete self)
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'U kunt uw eigen account niet verwijderen' });
  }
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'Niet gevonden' });

  db.prepare('UPDATE users SET is_active = -1, updated_at = unixepoch() WHERE id = ?').run(userId);
  res.json({ message: 'Gebruiker verwijderd' });
});

module.exports = router;
