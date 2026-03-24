# LinguaMaster Deployment Guide

## Quick Start Deployment

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ database
- API keys for Google Gemini and OpenAI
- SSL certificate (for production)

### Step-by-Step Deployment

#### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL (if not installed)
sudo apt install postgresql postgresql-contrib -y
```

#### 2. Database Setup
```bash
# Create database
sudo -u postgres createdb linguamaster

# Create database user
sudo -u postgres psql -c "CREATE USER linguamaster WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE linguamaster TO linguamaster;"
```

#### 3. Application Setup
```bash
# Clone repository
git clone <company-repository-url>
cd linguamaster

# Install dependencies
npm ci

# Configure environment
cp .env.example .env
nano .env  # Edit with your production values
```

#### 4. Environment Configuration
Edit `.env` with production values:
```bash
# Database
DATABASE_URL=postgresql://linguamaster:your_secure_password@localhost:5432/linguamaster
PGHOST=localhost
PGPORT=5432
PGDATABASE=linguamaster
PGUSER=linguamaster
PGPASSWORD=your_secure_password

# AI Services
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Application
NODE_ENV=production
PORT=5000
LOG_LEVEL=INFO

# Security (CHANGE THESE!)
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
ALLOWED_ORIGINS=https://linguamaster.app,https://www.linguamaster.app
APP_BASE_URL=https://www.linguamaster.app

# Rate Limiting
API_RATE_LIMIT=100
AUTH_RATE_LIMIT=5
AI_RATE_LIMIT=10
```

For production hosts, prefer injecting these values from a secret manager (for example AWS Secrets Manager, GCP Secret Manager, Vault, or Doppler) instead of storing long-lived secrets in plaintext files.

#### 5. Build Application
```bash
# Build frontend and backend
npm run build

# Run database migrations
npm run db:push

# Apply performance indexes
psql -d linguamaster -f db/migrations/add_performance_indexes.sql
```

#### 6. Run Smoke Test
```bash
# Run comprehensive smoke test
bash scripts/smoke-test.sh
```

#### 7. Start Application

**Option A: Direct Start (for testing)**
```bash
npm start
```

**Option B: PM2 (recommended for production)**
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name linguamaster -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

**Option C: Systemd Service (alternative)**
```bash
# Create systemd service file
sudo nano /etc/systemd/system/linguamaster.service
```

Add the following content:
```ini
[Unit]
Description=LinguaMaster AI Language Learning Platform
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/linguamaster
Environment=NODE_ENV=production
EnvironmentFile=/path/to/linguamaster/.env
ExecStart=/usr/bin/node -r dotenv/config dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then enable and start:
```bash
sudo systemctl enable linguamaster
sudo systemctl start linguamaster
sudo systemctl status linguamaster
```

#### 8. Setup Nginx Reverse Proxy
```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/linguamaster
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name linguamaster.app www.linguamaster.app;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name linguamaster.app www.linguamaster.app;

    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/linguamaster /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 9. Setup SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d linguamaster.app -d www.linguamaster.app

# Test auto-renewal
sudo certbot renew --dry-run
```

#### 10. Setup Monitoring

**Install and configure monitoring tools:**
```bash
# Install monitoring dependencies
npm install -g pm2-logrotate

# Configure log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

**Setup health check endpoint:**
Create a simple health check script:
```bash
#!/bin/bash
# health-check.sh

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health)

if [ "$RESPONSE" = "200" ]; then
    echo "✓ Application is healthy"
    exit 0
else
    echo "✗ Application is unhealthy (HTTP $RESPONSE)"
    exit 1
fi
```

Add to crontab for monitoring:
```bash
# Run health check every 5 minutes
*/5 * * * * /path/to/health-check.sh >> /var/log/linguamaster-health.log 2>&1
```

#### 11. Setup Backups

Built-in automation scripts are available in this repository:
```bash
# Create compressed backup (uses DATABASE_URL)
npm run backup:db

# Restore from backup file
npm run restore:db -- ./backups/linguamaster_YYYYMMDD_HHMMSS.sql.gz

# Run backup + restore drill (requires DRILL_DATABASE_URL)
npm run drill:backup-restore
```

**Database backup script:**
```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/var/backups/linguamaster"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/linguamaster_$DATE.sql"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U linguamaster linguamaster > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup-database.sh >> /var/log/linguamaster-backup.log 2>&1
```

#### 12. Firewall Configuration
```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL (only from localhost)
sudo ufw allow from 127.0.0.1 to any port 5432

# Enable firewall
sudo ufw enable
```

## Post-Deployment Verification

### 1. Check Application Status
```bash
# If using PM2
pm2 status
pm2 logs linguamaster --lines 50

# If using systemd
sudo systemctl status linguamaster
sudo journalctl -u linguamaster -n 50
```

### 2. Test Endpoints
```bash
# Health check
curl https://www.linguamaster.app/api/health

# Test authentication
curl -X POST https://www.linguamaster.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test123!@#","email":"test@example.com"}'
```

### 3. Monitor Logs
```bash
# Application logs
tail -f /path/to/logs/application.log

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### 4. Performance Testing
```bash
# Install Apache Bench
sudo apt install apache2-utils -y

# Test API performance
ab -n 1000 -c 10 https://www.linguamaster.app/api/health
```

## Troubleshooting

### Application Won't Start
```bash
# Check logs
pm2 logs linguamaster --err

# Check environment variables
pm2 env 0

# Restart application
pm2 restart linguamaster
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
psql -U linguamaster -d linguamaster -h localhost

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### High Memory Usage
```bash
# Check memory usage
pm2 monit

# Restart application
pm2 restart linguamaster

# Consider increasing server resources
```

### SSL Certificate Issues
```bash
# Check certificate expiration
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test Nginx configuration
sudo nginx -t
```

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (e.g., Nginx, HAProxy)
- Deploy multiple application instances
- Use Redis for session storage
- Implement database read replicas

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Optimize database queries
- Implement caching strategies
- Use CDN for static assets

### Database Scaling
- Implement connection pooling
- Use read replicas for read-heavy operations
- Consider database sharding for large datasets
- Implement database caching (Redis)

## Maintenance

### Regular Tasks
- **Daily**: Check logs for errors
- **Weekly**: Review performance metrics
- **Monthly**: Update dependencies, security audit
- **Quarterly**: Review and optimize database

### Update Procedure
```bash
# 1. Backup database
bash backup-database.sh

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
npm ci

# 4. Build application
npm run build

# 5. Run migrations
npm run db:push

# 6. Restart application
pm2 restart linguamaster

# 7. Verify deployment
bash scripts/smoke-test.sh
```

## Rollback Procedure

If deployment fails:
```bash
# 1. Stop current version
pm2 stop linguamaster

# 2. Restore previous version
git checkout <previous-commit-hash>
npm ci
npm run build

# 3. Restore database (if needed)
gunzip < /var/backups/linguamaster/linguamaster_YYYYMMDD_HHMMSS.sql.gz | psql -U linguamaster linguamaster

# 4. Restart application
pm2 restart linguamaster
```

## Support & Resources

- **Documentation**: See README.md and PRODUCTION_READINESS.md
- **Logs**: Check /var/log/ and application logs
- **Monitoring**: Set up external monitoring (e.g., UptimeRobot, Pingdom)
- **Alerts**: Configure email/SMS alerts for critical issues

---

**Last Updated**: March 16, 2026
**Version**: 1.0.0
