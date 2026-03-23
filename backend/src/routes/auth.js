const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db, fullName } = require('../db');
const { sendConfirmationEmail, sendWelcomeEmail } = require('../email');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'E-mail en wachtwoord zijn verplicht' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Ongeldig e-mailadres of wachtwoord' });

  if (!user.is_active) {
    return res.status(401).json({ error: 'Account nog niet bevestigd. Controleer uw e-mail.' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Ongeldig e-mailadres of wachtwoord' });

  const token = jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      tussenvoegsel: user.tussenvoegsel,
      last_name: user.last_name,
      full_name: fullName(user),
    },
  });
});

// POST /api/auth/register  (employee self-registration)
router.post('/register', async (req, res) => {
  const { email, password, first_name, tussenvoegsel, last_name, phone } = req.body;
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'E-mail, wachtwoord, voornaam en achternaam zijn verplicht' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const domain = normalizedEmail.split('@')[1];
  if (!domain) return res.status(400).json({ error: 'Ongeldig e-mailadres' });

  // Check allowed domains
  const domainsRow = db.prepare("SELECT value FROM config WHERE key = 'allowed_domains'").get();
  let allowedDomains = [];
  try { allowedDomains = JSON.parse(domainsRow?.value || '[]'); } catch {}

  if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
    return res.status(403).json({ error: `E-maildomein @${domain} is niet toegestaan` });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) return res.status(409).json({ error: 'E-mailadres is al geregistreerd' });

  const hash = await bcrypt.hash(password, 12);
  const token = uuidv4();
  const expires = Date.now() + 24 * 60 * 60 * 1000;

  db.prepare(`
    INSERT INTO users (email, password_hash, role, first_name, tussenvoegsel, last_name, phone, is_active, confirm_token, confirm_expires)
    VALUES (?, ?, 'employee', ?, ?, ?, ?, 0, ?, ?)
  `).run(normalizedEmail, hash, first_name.trim(), tussenvoegsel?.trim() || null, last_name.trim(), phone?.trim() || null, token, expires);

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  await sendConfirmationEmail(user, token);

  res.status(201).json({ message: 'Registratie ontvangen. Controleer uw e-mail om uw adres te bevestigen.' });
});

// GET /api/auth/confirm/:token
router.get('/confirm/:token', (req, res) => {
  const { token } = req.params;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const user = db.prepare('SELECT * FROM users WHERE confirm_token = ?').get(token);
  if (!user) return res.redirect(`${frontendUrl}/login?error=invalid_token`);

  if (Date.now() > user.confirm_expires) {
    return res.redirect(`${frontendUrl}/login?error=token_expired`);
  }

  db.prepare(`
    UPDATE users SET is_active = 1, confirm_token = NULL, confirm_expires = NULL, updated_at = unixepoch()
    WHERE id = ?
  `).run(user.id);

  // Send welcome email (fire and forget)
  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  sendWelcomeEmail(updatedUser).catch(() => {});

  return res.redirect(`${frontendUrl}/login?confirmed=1`);
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Niet geautoriseerd' });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
    if (!user) return res.status(404).json({ error: 'Gebruiker niet gevonden' });
    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      tussenvoegsel: user.tussenvoegsel,
      last_name: user.last_name,
      phone: user.phone,
      full_name: fullName(user),
    });
  } catch {
    return res.status(401).json({ error: 'Ongeldig token' });
  }
});

module.exports = router;
