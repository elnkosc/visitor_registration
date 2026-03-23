const router = require('express').Router();
const { db, fullName } = require('../db');
const { sendVisitorArrivedEmail } = require('../email');

// GET /api/kiosk/employees  (for walk-in host selection)
router.get('/employees', (req, res) => {
  const employees = db.prepare(
    "SELECT id, first_name, tussenvoegsel, last_name FROM users WHERE role = 'employee' AND is_active = 1 ORDER BY last_name, first_name"
  ).all();
  res.json(employees.map(u => ({ id: u.id, full_name: fullName(u) })));
});

// GET /api/kiosk/search?last_name=...  (look up today's pre-registered visitors by last name)
router.get('/search', (req, res) => {
  const { last_name } = req.query;
  if (!last_name || last_name.trim().length < 2) {
    return res.status(400).json({ error: 'Voer minimaal 2 tekens in van de achternaam' });
  }

  const today = new Date().toISOString().split('T')[0];
  const rows = db.prepare(`
    SELECT v.id, v.first_name, v.tussenvoegsel, v.last_name, v.company, v.status,
           u.first_name as h_first, u.tussenvoegsel as h_tussen, u.last_name as h_last
    FROM visitors v
    LEFT JOIN users u ON v.host_user_id = u.id
    WHERE v.last_name LIKE ? AND v.expected_date = ? AND v.status = 'planned'
    ORDER BY v.last_name, v.first_name
  `).all(`%${last_name.trim()}%`, today);

  res.json(rows.map(v => ({
    id: v.id,
    first_name: v.first_name,
    tussenvoegsel: v.tussenvoegsel,
    last_name: v.last_name,
    full_name: fullName(v),
    company: v.company,
    host_name: v.h_last ? fullName({ first_name: v.h_first, tussenvoegsel: v.h_tussen, last_name: v.h_last }) : null,
  })));
});

// GET /api/kiosk/search-checkedin?last_name=...  (look up checked-in visitors for checkout)
router.get('/search-checkedin', (req, res) => {
  const { last_name } = req.query;
  if (!last_name || last_name.trim().length < 2) {
    return res.status(400).json({ error: 'Voer minimaal 2 tekens in van de achternaam' });
  }

  const rows = db.prepare(`
    SELECT v.id, v.first_name, v.tussenvoegsel, v.last_name, v.company,
           u.first_name as h_first, u.tussenvoegsel as h_tussen, u.last_name as h_last
    FROM visitors v
    LEFT JOIN users u ON v.host_user_id = u.id
    WHERE v.last_name LIKE ? AND v.status = 'checked_in'
    ORDER BY v.last_name, v.first_name
  `).all(`%${last_name.trim()}%`);

  res.json(rows.map(v => ({
    id: v.id,
    full_name: fullName(v),
    company: v.company,
    host_name: v.h_last ? fullName({ first_name: v.h_first, tussenvoegsel: v.h_tussen, last_name: v.h_last }) : null,
  })));
});

// POST /api/kiosk/checkin  (visitor self check-in)
router.post('/checkin', async (req, res) => {
  const { visitor_id, email, phone, license_plate } = req.body;
  if (!visitor_id) return res.status(400).json({ error: 'visitor_id is verplicht' });

  const v = db.prepare('SELECT * FROM visitors WHERE id = ?').get(visitor_id);
  if (!v) return res.status(404).json({ error: 'Bezoeker niet gevonden' });
  if (v.status !== 'planned') return res.status(400).json({ error: 'Bezoeker kan niet inchecken (status: ' + v.status + ')' });

  const today = new Date().toISOString().split('T')[0];
  if (v.expected_date !== today) return res.status(400).json({ error: 'Bezoeker is niet geregistreerd voor vandaag' });

  db.prepare(`
    UPDATE visitors SET status = 'checked_in', checked_in_at = unixepoch(),
      email = COALESCE(?, email), phone = COALESCE(?, phone), license_plate = COALESCE(?, license_plate),
      updated_at = unixepoch()
    WHERE id = ?
  `).run(email || null, phone || null, license_plate || null, visitor_id);

  const updated = db.prepare('SELECT * FROM visitors WHERE id = ?').get(visitor_id);
  const host = updated.host_user_id ? db.prepare('SELECT * FROM users WHERE id = ?').get(updated.host_user_id) : null;

  if (host) await sendVisitorArrivedEmail(host, updated).catch(() => {});

  res.json({
    message: 'Welkom! U bent ingecheckt.',
    full_name: fullName(updated),
    host_name: host ? fullName(host) : null,
  });
});

// POST /api/kiosk/checkout  (visitor self check-out)
router.post('/checkout', (req, res) => {
  const { visitor_id } = req.body;
  if (!visitor_id) return res.status(400).json({ error: 'visitor_id is verplicht' });

  const v = db.prepare('SELECT * FROM visitors WHERE id = ?').get(visitor_id);
  if (!v) return res.status(404).json({ error: 'Bezoeker niet gevonden' });
  if (v.status !== 'checked_in') return res.status(400).json({ error: 'Bezoeker is niet ingecheckt' });

  db.prepare("UPDATE visitors SET status = 'checked_out', checked_out_at = unixepoch(), updated_at = unixepoch() WHERE id = ?")
    .run(visitor_id);

  res.json({ message: 'Tot ziens! U bent uitgelogd.', full_name: fullName(v) });
});

// POST /api/kiosk/walkin  (walk-in visitor: create + check in immediately)
router.post('/walkin', async (req, res) => {
  const { first_name, tussenvoegsel, last_name, company, email, phone, license_plate, host_user_id } = req.body;
  if (!first_name || !last_name) return res.status(400).json({ error: 'Voornaam en achternaam zijn verplicht' });
  if (!host_user_id) return res.status(400).json({ error: 'Medewerker is verplicht' });

  const host = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'employee' AND is_active = 1").get(host_user_id);
  if (!host) return res.status(400).json({ error: 'Medewerker niet gevonden' });

  const today = new Date().toISOString().split('T')[0];

  const result = db.prepare(`
    INSERT INTO visitors (first_name, tussenvoegsel, last_name, company, email, phone, license_plate, host_user_id, expected_date, status, checked_in_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'checked_in', unixepoch())
  `).run(
    first_name.trim(),
    tussenvoegsel?.trim() || null,
    last_name.trim(),
    company?.trim() || null,
    email?.trim() || null,
    phone?.trim() || null,
    license_plate?.trim() || null,
    host_user_id,
    today
  );

  const visitor = db.prepare('SELECT * FROM visitors WHERE id = ?').get(result.lastInsertRowid);
  await sendVisitorArrivedEmail(host, visitor).catch(() => {});

  res.status(201).json({
    message: 'Welkom! U bent geregistreerd en ingecheckt.',
    full_name: fullName(visitor),
    host_name: fullName(host),
  });
});

module.exports = router;
