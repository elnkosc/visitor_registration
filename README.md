# Bezoekersregistratie

Web applicatie voor het registreren van bezoekers bij bedrijven.

## Technologie

- **Backend**: Node.js + Express + SQLite (better-sqlite3) + Nodemailer
- **Frontend**: React + Vite + React Router

## Installatie

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Pas .env aan met uw instellingen
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Standaard beheerder

Bij de eerste opstart wordt automatisch een beheerder aangemaakt:

- **E-mail**: `admin@localhost`
- **Wachtwoord**: `admin123`

**Wijzig dit wachtwoord na de eerste inlog!**

## Gebruikersrollen

| Rol | Beschrijving |
|-----|-------------|
| `admin` | Beheert configuratie en gebruikers |
| `receptionist` | Beheert bezoekers aan de balie |
| `employee` | Meldt bezoekers aan en ontvangt notificaties |

## Kiosk

De kioskpagina is bereikbaar via `/kiosk` zonder inloggen. Bedoeld voor gebruik op een tablet bij de balie.

## Configuratie (`.env`)

```env
PORT=3001
JWT_SECRET=verander_dit_naar_een_willekeurig_lange_string
DATABASE_PATH=./data/visitors.db
FRONTEND_URL=http://localhost:5173
```