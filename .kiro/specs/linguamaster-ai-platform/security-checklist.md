# Security Checklist - LinguaMaster AI Platform

This checklist provides a quick reference for security verification and ongoing security maintenance.

---

## Pre-Production Deployment Checklist

### Environment Configuration

- [ ] **Set NODE_ENV=production**
  - Enables HTTPS enforcement
  - Hides error stack traces
  - Activates production security settings

- [ ] **Generate Strong Secrets**
  - [ ] Generate cryptographically secure `JWT_SECRET` (min 32 chars)
  - [ ] Generate cryptographically secure `SESSION_SECRET` (min 32 chars)
  - [ ] Use `openssl rand -base64 32` or similar tool

- [ ] **Configure API Keys**
  - [ ] Set valid `GEMINI_API_KEY`
  - [ ] Set valid `OPENAI_API_KEY`
  - [ ] Verify keys are active and have proper permissions

- [ ] **Configure CORS**
  - [ ] Set `ALLOWED_ORIGINS` to production domain(s)
  - [ ] Remove development origins (localhost)
  - [ ] Test CORS with production domain

- [ ] **Database Configuration**
  - [ ] Set production `DATABASE_URL`
  - [ ] Verify database credentials are secure
  - [ ] Ensure database uses SSL/TLS

- [ ] **Verify .gitignore**
  - [ ] Confirm `.env` is in `.gitignore`
  - [ ] Verify no secrets in git history
  - [ ] Check no `.env` files committed

---

## Security Requirements Verification

### 25.1 Password Encryption ✅

- [x] Passwords encrypted using scrypt
- [x] Random salt generated per password
- [x] Timing-safe password comparison
- [x] Strong password requirements enforced:
  - [x] Minimum 8 characters
  - [x] At least one uppercase letter
  - [x] At least one lowercase letter
  - [x] At least one number
- [x] Passwords never stored in plaintext

**Test:**
```bash
# Register a user and verify password is hashed in database
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"Test1234"}'

# Check database - password should be in format: {hash}.{salt}
```

---

### 25.2 HTTPS Enforcement ✅

- [x] HTTPS required in production
- [x] Multiple secure connection detection methods
- [x] HSTS header configured (1-year max-age)
- [x] Security headers implemented:
  - [x] X-Frame-Options: DENY
  - [x] X-Content-Type-Options: nosniff
  - [x] X-XSS-Protection: 1; mode=block
  - [x] Referrer-Policy: strict-origin-when-cross-origin
  - [x] Permissions-Policy configured
  - [x] Content-Security-Policy configured

**Test:**
```bash
# Test HTTPS enforcement (should return 403 in production)
curl -X GET http://your-domain.com/api/user

# Test security headers
curl -I https://your-domain.com/api/user
```

---

### 25.3 CORS Policies ✅

- [x] Whitelist-based origin validation
- [x] ALLOWED_ORIGINS environment variable configured
- [x] Restricted HTTP methods
- [x] Controlled allowed headers
- [x] Credentials properly handled
- [x] Preflight requests handled

**Test:**
```bash
# Test allowed origin
curl -X OPTIONS http://localhost:5000/api/user \
  -H "Origin: https://your-domain.com" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Test disallowed origin (should not return CORS headers)
curl -X OPTIONS http://localhost:5000/api/user \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

---

### 25.4 Input Sanitization ✅

- [x] Global input sanitization middleware
- [x] XSS prevention (HTML tag removal)
- [x] Injection prevention (null byte removal)
- [x] DoS prevention (length limits)
- [x] Body, query, and params sanitized
- [x] Validation middleware for all input types

**Test:**
```bash
# Test XSS prevention
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"<script>alert(1)</script>","password":"Test1234"}'

# Test SQL injection prevention
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin'\'' OR 1=1--","password":"anything"}'

# Test length limit
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$(python3 -c 'print(\"a\"*20000)')\"}"
```

---

### 25.5 Session Timeout ✅

- [x] 24-hour JWT token expiration
- [x] Token expiration validated on every request
- [x] Secure session cookie configuration
- [x] Token refresh mechanism implemented
- [x] Clear expiration error messages

**Test:**
```bash
# Login and get token
TOKEN=$(curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test1234"}' \
  | jq -r '.token')

# Use token immediately (should work)
curl -X GET http://localhost:5000/api/user \
  -H "Authorization: Bearer $TOKEN"

# Test expired token (manually create expired token or wait 24 hours)
# Should return 401 with "Token has expired" message
```

---

### 25.6 API Key Protection ✅

- [x] All API keys in environment variables
- [x] No hardcoded secrets in source code
- [x] Startup validation for required keys
- [x] .env.example template provided
- [x] Clear error messages for missing keys

**Test:**
```bash
# Verify no secrets in code
grep -r "sk-" server/ client/ --exclude-dir=node_modules
grep -r "AIza" server/ client/ --exclude-dir=node_modules

# Test startup without keys (should fail with clear message)
unset GEMINI_API_KEY
npm start

# Verify .env is in .gitignore
git check-ignore .env
```

---

## Ongoing Security Maintenance

### Weekly Tasks

- [ ] Review authentication logs for suspicious activity
- [ ] Check rate limit violations
- [ ] Review error logs for security-related errors
- [ ] Verify all dependencies are up to date

### Monthly Tasks

- [ ] Review and rotate API keys if needed
- [ ] Audit user accounts for suspicious activity
- [ ] Review CORS allowed origins
- [ ] Check for security updates in dependencies
- [ ] Review access logs for unusual patterns

### Quarterly Tasks

- [ ] Rotate JWT_SECRET and SESSION_SECRET
- [ ] Conduct security audit
- [ ] Review and update security policies
- [ ] Test disaster recovery procedures
- [ ] Review and update this checklist

### Annual Tasks

- [ ] Professional penetration testing
- [ ] Security compliance audit
- [ ] Review and update security documentation
- [ ] Security training for development team

---

## Security Incident Response

### If Security Breach Suspected:

1. **Immediate Actions:**
   - [ ] Rotate all API keys immediately
   - [ ] Rotate JWT_SECRET and SESSION_SECRET
   - [ ] Invalidate all active sessions
   - [ ] Enable additional logging
   - [ ] Notify security team

2. **Investigation:**
   - [ ] Review access logs
   - [ ] Review error logs
   - [ ] Identify affected users
   - [ ] Determine breach scope
   - [ ] Document findings

3. **Remediation:**
   - [ ] Patch vulnerabilities
   - [ ] Reset affected user passwords
   - [ ] Notify affected users
   - [ ] Update security measures
   - [ ] Document lessons learned

4. **Post-Incident:**
   - [ ] Conduct post-mortem
   - [ ] Update security procedures
   - [ ] Implement additional monitoring
   - [ ] Train team on new procedures

---

## Security Testing Commands

### Password Security Test
```bash
# Test weak password rejection
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"weak"}'
# Expected: 400 with password requirements error
```

### Rate Limiting Test
```bash
# Test auth rate limiting (5 attempts per 15 minutes)
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"wrong","password":"wrong"}'
  echo "Attempt $i"
done
# Expected: 6th attempt should return 429 Too Many Requests
```

### HTTPS Enforcement Test
```bash
# Set NODE_ENV=production and test HTTP request
NODE_ENV=production curl -X GET http://localhost:5000/api/user
# Expected: 403 Forbidden with "HTTPS is required" message
```

### Token Expiration Test
```bash
# Create a token with short expiration for testing
# Modify JWT_EXPIRES_IN temporarily to '10s'
# Login, wait 11 seconds, then try to use token
# Expected: 401 with "Token has expired" message
```

### Input Sanitization Test
```bash
# Test XSS payload
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"<img src=x onerror=alert(1)>","password":"Test1234"}'
# Expected: Username should be sanitized (tags removed)

# Test null byte injection
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d $'{"username":"test\x00user","password":"Test1234"}'
# Expected: Null bytes should be removed
```

---

## Security Monitoring

### Metrics to Monitor:

1. **Authentication Metrics:**
   - Failed login attempts per IP
   - Failed login attempts per user
   - Successful logins from new IPs
   - Password reset requests

2. **Rate Limiting Metrics:**
   - Rate limit violations per IP
   - Rate limit violations per endpoint
   - Blocked requests

3. **Error Metrics:**
   - 401 Unauthorized errors
   - 403 Forbidden errors
   - 500 Internal Server errors
   - Security-related errors

4. **API Key Usage:**
   - API calls per key
   - Failed API key validations
   - Unusual API usage patterns

### Alerting Thresholds:

- **Critical:** 10+ failed login attempts from same IP in 5 minutes
- **High:** 50+ rate limit violations from same IP in 1 hour
- **Medium:** 100+ 401 errors in 1 hour
- **Low:** Any 500 errors with security implications

---

## Security Best Practices

### Development:

- [ ] Never commit secrets to git
- [ ] Use .env for local development
- [ ] Keep dependencies updated
- [ ] Run security linters (eslint-plugin-security)
- [ ] Review code for security issues
- [ ] Test security features before deployment

### Production:

- [ ] Use strong, unique secrets
- [ ] Enable all security headers
- [ ] Use HTTPS everywhere
- [ ] Monitor security logs
- [ ] Keep backups encrypted
- [ ] Implement least privilege access
- [ ] Regular security audits

### API Keys:

- [ ] Store in environment variables only
- [ ] Never log API keys
- [ ] Rotate regularly
- [ ] Use separate keys per environment
- [ ] Revoke unused keys
- [ ] Monitor key usage

---

## Compliance Verification

### Quick Compliance Check:

```bash
# Run all security tests
npm run test:security  # (if implemented)

# Check for hardcoded secrets
npm run audit:secrets  # (if implemented)

# Check dependencies for vulnerabilities
npm audit

# Check for outdated dependencies
npm outdated
```

### Manual Verification:

1. **Password Encryption:** ✅
   - Check database - passwords should be hashed
   - Test password comparison works
   - Verify timing-safe comparison

2. **HTTPS Enforcement:** ✅
   - Test HTTP request in production (should fail)
   - Verify HSTS header present
   - Check all security headers

3. **CORS Policies:** ✅
   - Test allowed origin (should work)
   - Test disallowed origin (should fail)
   - Verify credentials handling

4. **Input Sanitization:** ✅
   - Test XSS payloads (should be sanitized)
   - Test SQL injection (should be prevented)
   - Test length limits (should be enforced)

5. **Session Timeout:** ✅
   - Verify token expires after 24 hours
   - Test expired token rejection
   - Verify refresh mechanism works

6. **API Key Protection:** ✅
   - Verify no keys in source code
   - Verify keys in environment variables
   - Test startup validation

---

## Security Audit Schedule

| Audit Type | Frequency | Last Completed | Next Due |
|------------|-----------|----------------|----------|
| Code Review | Weekly | - | - |
| Dependency Audit | Weekly | - | - |
| Security Scan | Monthly | - | - |
| Penetration Test | Quarterly | - | - |
| Full Security Audit | Annual | December 2024 | December 2025 |

---

## Contact Information

### Security Team:
- **Security Lead:** [Name]
- **Email:** security@linguamaster.com
- **Emergency:** [Phone]

### Incident Reporting:
- **Email:** security-incidents@linguamaster.com
- **PGP Key:** [Key ID]

---

**Last Updated:** December 2024  
**Next Review:** March 2025  
**Version:** 1.0
