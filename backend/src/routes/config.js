const router = require('express').Router();
const { db } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { sendMail } = require('../email');

// GET /api/config
router.get('/', authenticate, authorize('admin'), (req, res) => {
  const rows = db.prepare('SELECT key, value FROM config').all();
  const config = {};
  for (const row of rows) {
    // Mask SMTP password
    config[row.key] = row.key === 'smtp_pass' ? (row.value ? '••••••••' : '') : row.value;
  }
  // Parse allowed_domains as array for convenience
  try { config.allowed_domains_parsed = JSON.parse(config.allowed_domains || '[]'); } catch { config.allowed_domains_parsed = []; }
  res.json(config);
});

// PUT /api/config
router.put('/', authenticate, authorize('admin'), (req, res) => {
  const allowed = ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_from', 'company_name', 'allowed_domains'];
  const upsert = db.prepare("INSERT INTO config(key,value,updated_at) VALUES(?,?,unixepoch()) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=unixepoch()");

  const update = db.transaction((body) => {
    for (const key of allowed) {
      if (body[key] !== undefined) {
        upsert.run(key, String(body[key]));
      }
    }
    // SMTP pass only updated if not masked
    if (body.smtp_pass !== undefined && body.smtp_pass !== '••••••••' && body.smtp_pass !== '') {
      upsert.run('smtp_pass', String(body.smtp_pass));
    }
  });

  update(req.body);
  res.json({ message: 'Configuratie opgeslagen' });
});

// PUT /api/config/domains
router.put('/domains', authenticate, authorize('admin'), (req, res) => {
  const { domains } = req.body;
  if (!Array.isArray(domains)) return res.status(400).json({ error: 'domains moet een array zijn' });

  const cleaned = domains.map(d => d.trim().toLowerCase()).filter(Boolean);
  db.prepare("INSERT INTO config(key,value,updated_at) VALUES('allowed_domains',?,unixepoch()) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=unixepoch()")
    .run(JSON.stringify(cleaned));

  res.json({ domains: cleaned });
});

// POST /api/config/smtp/test
router.post('/smtp/test', authenticate, authorize('admin'), async (req, res) => {
  const admin = db.prepare('SELECT email FROM users WHERE id = ?').get(req.user.id);
  const ok = await sendMail(admin.email, 'Test e-mail bezoekersregistratie', '<p>Dit is een test e-mail. De SMTP configuratie werkt correct.</p>');
  if (ok) {
    res.json({ message: `Test e-mail verstuurd naar ${admin.email}` });
  } else {
    res.status(500).json({ error: 'Kon geen e-mail versturen. Controleer de SMTP instellingen.' });
  }
});

module.exports = router;
