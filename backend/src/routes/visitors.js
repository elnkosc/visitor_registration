const router = require('express').Router();
const { db, fullName } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const {
  sendVisitorRegistrationEmail,
  sendVisitorUpdateEmail,
  sendVisitorCancelEmail,
  sendVisitorArrivedEmail,
} = require('../email');

function safeVisitor(v, host) {
  return {
    id: v.id,
    first_name: v.first_name,
    tussenvoegsel: v.tussenvoegsel,
    last_name: v.last_name,
    full_name: fullName(v),
    company: v.company,
    email: v.email,
    phone: v.phone,
    license_plate: v.license_plate,
    host_user_id: v.host_user_id,
    host_name: host ? fullName(host) : null,
    expected_date: v.expected_date,
    checked_in_at: v.checked_in_at,
    checked_out_at: v.checked_out_at,
    status: v.status,
    created_by: v.created_by,
    created_at: v.created_at,
    updated_at: v.updated_at,
  };
}

function getVisitorWithHost(id) {
  const v = db.prepare('SELECT * FROM visitors WHERE id = ?').get(id);
  if (!v) return null;
  const host = v.host_user_id ? db.prepare('SELECT * FROM users WHERE id = ?').get(v.host_user_id) : null;
  return safeVisitor(v, host);
}

// GET /api/visitors
router.get('/', authenticate, authorize('admin', 'receptionist', 'employee'), (req, res) => {
  const { search, date_from, date_to, status, page = 1, limit = 50 } = req.query;

  let query = 'SELECT v.*, u.first_name as h_first, u.tussenvoegsel as h_tussen, u.last_name as h_last FROM visitors v LEFT JOIN users u ON v.host_user_id = u.id WHERE v.status != ?';
  const params = ['cancelled'];

  // Employees only see their own visitors
  if (req.user.role === 'employee') {
    query += ' AND v.host_user_id = ?';
    params.push(req.user.id);
  }

  if (search) {
    query += ' AND (v.first_name LIKE ? OR v.last_name LIKE ? OR v.company LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (date_from) { query += ' AND v.expected_date >= ?'; params.push(date_from); }
  if (date_to) { query += ' AND v.expected_date <= ?'; params.push(date_to); }
  if (status) { query += ' AND v.status = ?'; params.push(status); }

  const total = db.prepare(query.replace('SELECT v.*, u.first_name as h_first, u.tussenvoegsel as h_tussen, u.last_name as h_last', 'SELECT COUNT(*) as cnt')).get(...params).cnt;

  query += ' ORDER BY v.expected_date DESC, v.last_name';
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  query += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), offset);

  const rows = db.prepare(query).all(...params);
  const data = rows.map(v => {
    const host = v.h_last ? { first_name: v.h_first, tussenvoegsel: v.h_tussen, last_name: v.h_last } : null;
    return safeVisitor(v, host);
  });

  res.json({ data, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
});

// GET /api/visitors/today  (today's visitors for receptionist dashboard)
router.get('/today', authenticate, authorize('admin', 'receptionist'), (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const rows = db.prepare(`
    SELECT v.*, u.first_name as h_first, u.tussenvoegsel as h_tussen, u.last_name as h_last
    FROM visitors v
    LEFT JOIN users u ON v.host_user_id = u.id
    WHERE v.expected_date = ? AND v.status != 'cancelled'
    ORDER BY v.status, v.last_name
  `).all(today);

  const data = rows.map(v => {
    const host = v.h_last ? { first_name: v.h_first, tussenvoegsel: v.h_tussen, last_name: v.h_last } : null;
    return safeVisitor(v, host);
  });
  res.json(data);
});

// GET /api/visitors/:id
router.get('/:id', authenticate, authorize('admin', 'receptionist', 'employee'), (req, res) => {
  const v = db.prepare('SELECT * FROM visitors WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Niet gevonden' });

  if (req.user.role === 'employee' && v.host_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Geen toegang' });
  }

  const host = v.host_user_id ? db.prepare('SELECT * FROM users WHERE id = ?').get(v.host_user_id) : null;
  res.json(safeVisitor(v, host));
});

// POST /api/visitors
router.post('/', authenticate, authorize('admin', 'receptionist', 'employee'), async (req, res) => {
  const { first_name, tussenvoegsel, last_name, company, expected_date, host_user_id } = req.body;

  if (!first_name || !last_name || !expected_date) {
    return res.status(400).json({ error: 'Voornaam, achternaam en datum zijn verplicht' });
  }

  let hostId = host_user_id;
  if (req.user.role === 'employee') {
    hostId = req.user.id;
  } else if (!hostId) {
    return res.status(400).json({ error: 'Medewerker is verplicht' });
  }

  const host = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'employee' AND is_active = 1").get(hostId);
  if (!host) return res.status(400).json({ error: 'Medewerker niet gevonden of niet actief' });

  const result = db.prepare(`
    INSERT INTO visitors (first_name, tussenvoegsel, last_name, company, expected_date, host_user_id, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, 'planned', ?)
  `).run(
    first_name.trim(),
    tussenvoegsel?.trim() || null,
    last_name.trim(),
    company?.trim() || null,
    expected_date,
    hostId,
    req.user.id
  );

  const visitor = db.prepare('SELECT * FROM visitors WHERE id = ?').get(result.lastInsertRowid);
  await sendVisitorRegistrationEmail(host, visitor).catch(() => {});

  res.status(201).json(safeVisitor(visitor, host));
});

// PUT /api/visitors/:id
router.put('/:id', authenticate, authorize('admin', 'receptionist', 'employee'), async (req, res) => {
  const { first_name, tussenvoegsel, last_name, company, expected_date, host_user_id } = req.body;
  const visitorId = parseInt(req.params.id, 10);

  const existing = db.prepare('SELECT * FROM visitors WHERE id = ?').get(visitorId);
  if (!existing) return res.status(404).json({ error: 'Niet gevonden' });
  if (existing.status === 'cancelled') return res.status(400).json({ error: 'Geannuleerde bezoekers kunnen niet worden gewijzigd' });

  if (req.user.role === 'employee' && existing.host_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Geen toegang' });
  }

  const updates = {};
  if (first_name !== undefined) updates.first_name = first_name.trim();
  if (tussenvoegsel !== undefined) updates.tussenvoegsel = tussenvoegsel?.trim() || null;
  if (last_name !== undefined) updates.last_name = last_name.trim();
  if (company !== undefined) updates.company = company?.trim() || null;
  if (expected_date !== undefined) updates.expected_date = expected_date;
  if (host_user_id !== undefined && req.user.role !== 'employee') {
    const host = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'employee' AND is_active = 1").get(host_user_id);
    if (!host) return res.status(400).json({ error: 'Medewerker niet gevonden' });
    updates.host_user_id = host_user_id;
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Geen wijzigingen' });

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE visitors SET ${setClauses}, updated_at = unixepoch() WHERE id = ?`)
    .run(...Object.values(updates), visitorId);

  const updated = db.prepare('SELECT * FROM visitors WHERE id = ?').get(visitorId);
  const hostId = updated.host_user_id;
  const host = hostId ? db.prepare('SELECT * FROM users WHERE id = ?').get(hostId) : null;

  if (host) await sendVisitorUpdateEmail(host, updated).catch(() => {});

  res.json(safeVisitor(updated, host));
});

// POST /api/visitors/:id/checkin  (receptionist manual check-in)
router.post('/:id/checkin', authenticate, authorize('admin', 'receptionist'), async (req, res) => {
  const visitorId = parseInt(req.params.id, 10);
  const v = db.prepare('SELECT * FROM visitors WHERE id = ?').get(visitorId);
  if (!v) return res.status(404).json({ error: 'Niet gevonden' });
  if (v.status === 'checked_in') return res.status(400).json({ error: 'Bezoeker is al ingecheckt' });
  if (v.status === 'cancelled') return res.status(400).json({ error: 'Bezoeker is geannuleerd' });

  const { email, phone, license_plate } = req.body;

  db.prepare(`
    UPDATE visitors SET status = 'checked_in', checked_in_at = unixepoch(), email = COALESCE(?, email), phone = COALESCE(?, phone), license_plate = COALESCE(?, license_plate), updated_at = unixepoch()
    WHERE id = ?
  `).run(email || null, phone || null, license_plate || null, visitorId);

  const updated = db.prepare('SELECT * FROM visitors WHERE id = ?').get(visitorId);
  const host = updated.host_user_id ? db.prepare('SELECT * FROM users WHERE id = ?').get(updated.host_user_id) : null;

  if (host) await sendVisitorArrivedEmail(host, updated).catch(() => {});

  res.json(safeVisitor(updated, host));
});

// POST /api/visitors/:id/checkout  (receptionist manual check-out)
router.post('/:id/checkout', authenticate, authorize('admin', 'receptionist'), (req, res) => {
  const visitorId = parseInt(req.params.id, 10);
  const v = db.prepare('SELECT * FROM visitors WHERE id = ?').get(visitorId);
  if (!v) return res.status(404).json({ error: 'Niet gevonden' });
  if (v.status !== 'checked_in') return res.status(400).json({ error: 'Bezoeker is niet ingecheckt' });

  db.prepare(`
    UPDATE visitors SET status = 'checked_out', checked_out_at = unixepoch(), updated_at = unixepoch()
    WHERE id = ?
  `).run(visitorId);

  const updated = db.prepare('SELECT * FROM visitors WHERE id = ?').get(visitorId);
  const host = updated.host_user_id ? db.prepare('SELECT * FROM users WHERE id = ?').get(updated.host_user_id) : null;
  res.json(safeVisitor(updated, host));
});

// DELETE /api/visitors/:id  (cancel)
router.delete('/:id', authenticate, authorize('admin', 'receptionist', 'employee'), async (req, res) => {
  const visitorId = parseInt(req.params.id, 10);
  const v = db.prepare('SELECT * FROM visitors WHERE id = ?').get(visitorId);
  if (!v) return res.status(404).json({ error: 'Niet gevonden' });

  if (req.user.role === 'employee' && v.host_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Geen toegang' });
  }

  if (v.status === 'checked_in') return res.status(400).json({ error: 'Ingecheckte bezoekers kunnen niet worden geannuleerd' });

  db.prepare("UPDATE visitors SET status = 'cancelled', updated_at = unixepoch() WHERE id = ?").run(visitorId);

  const host = v.host_user_id ? db.prepare('SELECT * FROM users WHERE id = ?').get(v.host_user_id) : null;
  if (host) await sendVisitorCancelEmail(host, v).catch(() => {});

  res.json({ message: 'Bezoeker geannuleerd' });
});

module.exports = router;
