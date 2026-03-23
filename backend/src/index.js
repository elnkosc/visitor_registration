require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDb } = require('./db');

const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const visitorsRouter = require('./routes/visitors');
const configRouter = require('./routes/config');
const kioskRouter = require('./routes/kiosk');

// Initialize database
initDb();

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Te veel aanmeldpogingen. Probeer het later opnieuw.' },
});
const kioskLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Te veel verzoeken.' },
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/users', usersRouter);
app.use('/api/visitors', visitorsRouter);
app.use('/api/config', configRouter);
app.use('/api/kiosk', kioskLimiter, kioskRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Interne serverfout' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
