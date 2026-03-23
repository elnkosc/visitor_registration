const nodemailer = require('nodemailer');
const { db, fullName } = require('./db');

function getTransporter() {
  const getVal = db.prepare('SELECT value FROM config WHERE key = ?');
  const host = getVal.get('smtp_host')?.value || '';
  const port = parseInt(getVal.get('smtp_port')?.value || '587', 10);
  const secure = getVal.get('smtp_secure')?.value === 'true';
  const user = getVal.get('smtp_user')?.value || '';
  const pass = getVal.get('smtp_pass')?.value || '';
  const from = getVal.get('smtp_from')?.value || user;

  if (!host || !user) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    from,
  });
}

async function sendMail(to, subject, html) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('Email not configured, skipping:', subject, 'to', to);
    return false;
  }
  const getVal = db.prepare('SELECT value FROM config WHERE key = ?');
  const from = getVal.get('smtp_from')?.value || getVal.get('smtp_user')?.value || 'noreply@localhost';
  const company = getVal.get('company_name')?.value || 'Bezoekersregistratie';
  try {
    await transporter.sendMail({ from: `"${company}" <${from}>`, to, subject, html });
    return true;
  } catch (err) {
    console.error('Email send error:', err.message);
    return false;
  }
}

async function sendConfirmationEmail(user, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${frontendUrl}/auth/confirm/${token}`;
  const name = fullName(user) || user.email;
  return sendMail(
    user.email,
    'Bevestig uw e-mailadres',
    `
    <p>Beste ${name},</p>
    <p>Klik op de onderstaande link om uw e-mailadres te bevestigen en uw registratie te voltooien:</p>
    <p><a href="${link}">${link}</a></p>
    <p>Deze link is 24 uur geldig.</p>
    <p>Als u zich niet heeft geregistreerd, kunt u deze e-mail negeren.</p>
    `
  );
}

async function sendWelcomeEmail(user) {
  const name = fullName(user) || user.email;
  return sendMail(
    user.email,
    'Welkom bij de bezoekersregistratie',
    `
    <p>Beste ${name},</p>
    <p>Uw registratie is voltooid. U kunt nu inloggen en bezoekers aanmelden.</p>
    <p>Uw gegevens:</p>
    <ul>
      <li>Naam: ${name}</li>
      <li>E-mail: ${user.email}</li>
      <li>Telefoon: ${user.phone || '-'}</li>
    </ul>
    `
  );
}

async function sendVisitorRegistrationEmail(employee, visitor) {
  const employeeName = fullName(employee);
  const visitorName = fullName(visitor);
  return sendMail(
    employee.email,
    `Bezoeker aangemeld: ${visitorName}`,
    `
    <p>Beste ${employeeName},</p>
    <p>Er is een bezoeker voor u aangemeld op <strong>${visitor.expected_date}</strong>:</p>
    <ul>
      <li>Naam: ${visitorName}</li>
      ${visitor.company ? `<li>Bedrijf: ${visitor.company}</li>` : ''}
    </ul>
    <p>U ontvangt een melding wanneer de bezoeker arriveert.</p>
    `
  );
}

async function sendVisitorUpdateEmail(employee, visitor) {
  const employeeName = fullName(employee);
  const visitorName = fullName(visitor);
  return sendMail(
    employee.email,
    `Bezoeker gewijzigd: ${visitorName}`,
    `
    <p>Beste ${employeeName},</p>
    <p>De aanmelding voor bezoeker <strong>${visitorName}</strong> is gewijzigd.</p>
    <ul>
      <li>Datum: ${visitor.expected_date}</li>
      ${visitor.company ? `<li>Bedrijf: ${visitor.company}</li>` : ''}
    </ul>
    `
  );
}

async function sendVisitorCancelEmail(employee, visitor) {
  const employeeName = fullName(employee);
  const visitorName = fullName(visitor);
  return sendMail(
    employee.email,
    `Bezoeker afgemeld: ${visitorName}`,
    `
    <p>Beste ${employeeName},</p>
    <p>De aanmelding voor bezoeker <strong>${visitorName}</strong> op ${visitor.expected_date} is geannuleerd.</p>
    `
  );
}

async function sendVisitorArrivedEmail(employee, visitor) {
  const employeeName = fullName(employee);
  const visitorName = fullName(visitor);
  return sendMail(
    employee.email,
    `Bezoeker gearriveerd: ${visitorName}`,
    `
    <p>Beste ${employeeName},</p>
    <p>Uw bezoeker <strong>${visitorName}</strong> is zojuist gearriveerd bij de receptie.</p>
    ${visitor.company ? `<p>Bedrijf: ${visitor.company}</p>` : ''}
    ${visitor.phone ? `<p>Mobiel: ${visitor.phone}</p>` : ''}
    `
  );
}

module.exports = {
  sendMail,
  sendConfirmationEmail,
  sendWelcomeEmail,
  sendVisitorRegistrationEmail,
  sendVisitorUpdateEmail,
  sendVisitorCancelEmail,
  sendVisitorArrivedEmail,
};
