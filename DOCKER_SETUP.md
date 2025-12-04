# Docker Setup Guide

## Prerequisites

1. Docker Desktop installed and running
2. Enable WSL 2 integration in Docker Desktop settings

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Enable WSL Integration in Docker Desktop:**
   - Open Docker Desktop
   - Go to Settings → Resources → WSL Integration
   - Enable integration with your WSL distro
   - Click "Apply & Restart"

2. **Start the application:**
   ```bash
   cd /mnt/d/claude\ dash/claude-dash
   docker-compose up --build
   ```

3. **Access the application:**
   - Open browser: http://localhost:800
   - Database is automatically created and migrated

4. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Option 2: Run from Windows (if WSL integration doesn't work)

1. **Open PowerShell or Command Prompt in Windows**

2. **Navigate to the project:**
   ```powershell
   cd "D:\claude dash\claude-dash"
   ```

3. **Start with Docker Compose:**
   ```powershell
   docker-compose up --build
   ```

4. **Access at:** http://localhost:800

## What's Included

The `docker-compose.yml` file sets up:
- **PostgreSQL 16** database on port 5432
- **Next.js app** on port 800
- Automatic database migrations
- Persistent data storage

## Environment Variables

Default configuration (can be changed in `docker-compose.yml`):
- `DATABASE_URL`: postgresql://postgres:postgres@postgres:5432/claude_dash
- `NEXTAUTH_URL`: http://localhost:800
- `NEXTAUTH_SECRET`: (change in production!)

## Troubleshooting

### Docker command not found in WSL
Enable WSL integration in Docker Desktop settings (see step 1 above)

### Port already in use
Change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "3000:800"  # Use port 3000 instead
```

### Database connection issues
Ensure PostgreSQL container is healthy:
```bash
docker-compose logs postgres
```

## Development Commands

```bash
# View logs
docker-compose logs -f

# Rebuild after changes
docker-compose up --build

# Stop and remove containers
docker-compose down

# Remove volumes (fresh start)
docker-compose down -v

# Run database migrations manually
docker-compose exec app npx prisma migrate deploy

# Access database
docker-compose exec postgres psql -U postgres -d claude_dash
```

## Production Deployment

For production, update `docker-compose.yml`:
1. Change `NEXTAUTH_SECRET` to a secure random string
2. Use strong database password
3. Configure proper SMTP settings for email
4. Add volume mounts for uploads/data persistence
