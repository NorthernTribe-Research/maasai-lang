# LinguaMaster - Quick Deploy Reference

## 🚀 5-Minute Production Deploy

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- API Keys (Gemini, OpenAI)

### Deploy Steps

```bash
# 1. Clone & Install
git clone <company-repository-url>
cd linguamaster
npm ci

# 2. Configure
cp .env.example .env
nano .env  # Add your production values

# 3. Build
npm run build

# 4. Database
npm run db:push
psql -d linguamaster -f db/migrations/add_performance_indexes.sql

# 5. Test
bash scripts/smoke-test.sh

# 6. Start
npm start
# OR with PM2: pm2 start npm --name linguamaster -- start
```

## 🔑 Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/linguamaster

# AI Services
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Security (CHANGE THESE!)
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)

# Application
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://www.linguamaster.app
```

## ✅ Pre-Launch Checklist

- [ ] Changed all default secrets
- [ ] Configured production database
- [ ] Set up SSL/HTTPS
- [ ] Configured AI API keys
- [ ] Ran smoke test successfully
- [ ] Tested authentication flow
- [ ] Set up error monitoring
- [ ] Configured backups

## 🔍 Health Check

```bash
# Check application
curl https://www.linguamaster.app/api/health

# Check logs
pm2 logs linguamaster --lines 50

# Check status
pm2 status
```

## 🆘 Quick Troubleshooting

### App Won't Start
```bash
pm2 logs linguamaster --err
pm2 restart linguamaster
```

### Database Issues
```bash
sudo systemctl status postgresql
psql -U linguamaster -d linguamaster -h localhost
```

### SSL Issues
```bash
sudo certbot certificates
sudo certbot renew
sudo nginx -t
```

## 📚 Full Documentation

- **Detailed Guide**: DEPLOYMENT_GUIDE.md
- **Production Checklist**: PRODUCTION_READINESS.md
- **Status Report**: FINAL_STATUS_REPORT.md

## 🎯 Success Criteria

✅ Build completes without errors  
✅ Smoke test passes  
✅ Application accessible via HTTPS  
✅ Authentication works  
✅ Database connected  
✅ AI services responding  

---

**Need Help?** Check DEPLOYMENT_GUIDE.md for detailed instructions.
