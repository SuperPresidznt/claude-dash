# Installation Guide - Structure Is Grace

## Quick Start

This guide walks you through setting up the Structure Is Grace life dashboard application locally.

---

## Prerequisites

- **Node.js:** v18.17 or higher
- **PostgreSQL:** v14 or higher
- **Git:** For cloning the repository
- **Google Cloud Account:** For Calendar API integration (optional but recommended)

---

## Step 1: Clone Repository

```bash
git clone <repository-url>
cd claude-dash
```

---

## Step 2: Install Dependencies

```bash
npm install
```

**Note:** If you're in a WSL1 environment, you may need to upgrade to WSL2 or run npm install on Windows directly.

**Required packages:**
- Next.js 14+
- React 18
- Prisma 5+
- NextAuth 5 (beta)
- googleapis (for Calendar integration)
- Tailwind CSS
- date-fns
- zod
- Recharts

All dependencies are listed in `package.json`.

---

## Step 3: Database Setup

### Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE structureisgrace;

# Exit psql
\q
```

### Set Environment Variables

Create `.env.local` in the project root:

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/structureisgrace"

# NextAuth
AUTH_SECRET="your-random-secret-key-here"
NEXTAUTH_URL="http://localhost:800"

# Email (for magic link authentication)
EMAIL_FROM="noreply@structureisgrace.app"
EMAIL_SERVER_HOST="smtp.example.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email"
EMAIL_SERVER_PASSWORD="your-password"

# Google OAuth (optional - for Calendar integration)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

**Generate AUTH_SECRET:**
```bash
openssl rand -base64 32
```

### Run Migrations

```bash
npx prisma migrate dev
npx prisma generate
```

This will:
1. Create all database tables
2. Generate Prisma client
3. Apply all migrations

### Seed Database (Optional)

```bash
npm run prisma:seed
```

This creates sample data for testing.

---

## Step 4: Google OAuth Setup (Optional)

If you want Google Calendar integration:

### 1. Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click "Create Project"
3. Name: "Structure Is Grace"
4. Click "Create"

### 2. Enable Google Calendar API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click "Enable"

### 3. Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "Structure Is Grace Local"
5. Authorized JavaScript origins:
   - `http://localhost:800`
6. Authorized redirect URIs:
   - `http://localhost:800/api/auth/callback/google`
7. Click "Create"
8. Copy Client ID and Client Secret

### 4. Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. User Type: "External" (or Internal if using Google Workspace)
3. Fill in required fields:
   - App name: "Structure Is Grace"
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
4. Scopes: Add non-sensitive scopes (email, profile automatically included)
5. Test users: Add your Google account email
6. Save and continue

### 5. Update .env.local

Add the credentials from step 3:

```bash
GOOGLE_CLIENT_ID="your-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret-here"
```

---

## Step 5: Email Configuration (Optional)

For magic link authentication, configure an SMTP server:

### Development (MailHog - Recommended)

```bash
# Install MailHog (macOS)
brew install mailhog

# Install MailHog (Windows with Chocolatey)
choco install mailhog

# Run MailHog
mailhog
```

Update `.env.local`:
```bash
EMAIL_SERVER_HOST="localhost"
EMAIL_SERVER_PORT="1025"
EMAIL_SERVER_USER=""
EMAIL_SERVER_PASSWORD=""
```

Magic links will be displayed in console and caught by MailHog (http://localhost:8025).

### Production (Gmail Example)

```bash
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-gmail@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-specific-password"
EMAIL_FROM="Your Name <your-gmail@gmail.com>"
```

**Note:** For Gmail, enable 2FA and generate an "App Password".

---

## Step 6: Run Development Server

```bash
npm run dev
```

The application will be available at http://localhost:800

---

## Step 7: Verify Installation

1. Open http://localhost:800
2. You should be redirected to `/signin`
3. Sign in with email (magic link) or Google OAuth
4. After authentication, you should see the dashboard

---

## Testing

### Unit Tests (Vitest)

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

---

## Troubleshooting

### Database Connection Errors

**Error:** `Can't reach database server`

**Solution:**
1. Verify PostgreSQL is running: `pg_isready`
2. Check DATABASE_URL in `.env.local`
3. Test connection: `psql $DATABASE_URL`

### Migration Errors

**Error:** `Migration failed to apply`

**Solution:**
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or manually fix
npx prisma migrate resolve --applied "migration-name"
```

### Google OAuth Errors

**Error:** `redirect_uri_mismatch`

**Solution:**
1. Verify redirect URI in Google Cloud Console matches exactly:
   `http://localhost:800/api/auth/callback/google`
2. Check NEXTAUTH_URL in `.env.local` is `http://localhost:800`

**Error:** `access_denied` or `invalid_grant`

**Solution:**
1. Clear cookies and try again
2. Ensure OAuth consent screen is configured
3. Add your email to test users list

### Email Errors

**Error:** Magic link not sending

**Solution:**
1. Check console logs for magic link URL (dev mode)
2. Verify EMAIL_SERVER_* variables are correct
3. For Gmail, use App Password, not regular password

### Build Errors

**Error:** `Module not found: Can't resolve 'googleapis'`

**Solution:**
```bash
npm install googleapis
```

### WSL Issues

**Error:** `WSL 1 is not supported`

**Solution:**
- Upgrade to WSL 2: `wsl --set-version <distro> 2`
- Or run npm install on Windows: `cd /mnt/c/your/path && cmd.exe /c npm install`

---

## Production Deployment

### Environment Variables

Create `.env.production`:

```bash
NODE_ENV=production
DATABASE_URL="postgresql://user:password@production-host:5432/structureisgrace"
AUTH_SECRET="production-secret-key"
NEXTAUTH_URL="https://yourdomain.com"
GOOGLE_CLIENT_ID="production-client-id"
GOOGLE_CLIENT_SECRET="production-client-secret"
EMAIL_SERVER_HOST="smtp.production.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="production-email"
EMAIL_SERVER_PASSWORD="production-password"
```

### Build

```bash
npm run build
npm start
```

### Deployment Platforms

**Vercel (Recommended):**
1. Connect GitHub repository
2. Add environment variables in Vercel dashboard
3. Deploy

**Docker:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 800
CMD ["npm", "start"]
```

**Other Platforms:**
- Railway
- Fly.io
- AWS Elastic Beanstalk
- DigitalOcean App Platform

---

## Maintenance

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update all packages
npm update

# Update Prisma
npm install prisma@latest @prisma/client@latest
npx prisma generate
```

### Database Backups

```bash
# Backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

### Logs

- **Development:** Console logs
- **Production:** Set up logging service (Sentry, LogRocket, etc.)

---

## Support

- **Documentation:** `/docs` folder
- **Architecture:** `/docs/architecture.md`
- **Roadmap:** `/docs/roadmap.md`
- **Issues:** Create GitHub issue

---

## Next Steps

After successful installation:

1. Explore the dashboard at `/dashboard`
2. Create your first task at `/tasks`
3. Set up a habit at `/habits`
4. Connect Google Calendar at `/calendar`
5. Configure settings at `/settings`
6. Review documentation in `/docs`

---

_Last Updated: 2025-12-03_
