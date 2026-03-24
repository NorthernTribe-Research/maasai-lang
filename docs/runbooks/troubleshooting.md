# Troubleshooting Guide

**Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7**

## Overview

This guide provides systematic procedures for diagnosing and resolving common issues in the LinguaMaster platform.

## Quick Diagnostic Commands

### System Health Check
```bash
# Overall health status
curl https://linguamaster.ai/api/health | jq

# Liveness probe
curl https://linguamaster.ai/api/health/live

# Readiness probe
curl https://linguamaster.ai/api/health/ready
```

### Service Status
```bash
# Cloud Run service status
gcloud run services describe linguamaster \
  --region=us-central1 \
  --project=northerntriberesearch

# List recent revisions
gcloud run revisions list \
  --service=linguamaster \
  --region=us-central1 \
  --limit=10
```

### Log Analysis
```bash
# Recent errors
gcloud logging read "severity>=ERROR" \
  --limit=50 \
  --format=json

# Specific time range
gcloud logging read "severity>=ERROR AND timestamp>=\"2024-01-15T14:00:00Z\"" \
  --limit=100

# Filter by request path
gcloud logging read "httpRequest.requestUrl=~\"/api/lessons\"" \
  --limit=50
```

### Database Status
```bash
# Cloud SQL instance status
gcloud sql instances describe linguamaster-db \
  --project=northerntriberesearch

# Connection test
psql $DATABASE_URL -c "SELECT 1;"

# Active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

### Metrics
```bash
# Get metrics summary
curl https://linguamaster.ai/api/metrics/summary | jq

# Prometheus metrics
curl https://linguamaster.ai/api/metrics
```

## Common Error Messages and Resolutions

### Error: "Database connection failed"

**Symptoms**:
- Users cannot login
- 500 errors on API requests
- Health check shows database down

**Diagnosis**:
```bash
# Check Cloud SQL status
gcloud sql instances describe linguamaster-db

# Check connection from Cloud Run
gcloud run services describe linguamaster --format="value(status.url)"
curl $(gcloud run services describe linguamaster --format="value(status.url)")/api/health

# Check database logs
gcloud sql operations list --instance=linguamaster-db --limit=10
```

**Common Causes**:
1. Cloud SQL instance stopped or restarting
2. Connection pool exhausted
3. Network connectivity issues
4. Invalid credentials
5. Firewall rules blocking connection

**Resolution**:
```bash
# 1. Restart Cloud SQL instance
gcloud sql instances restart linguamaster-db

# 2. Check connection pool settings
# Review server/db.ts for pool configuration

# 3. Verify Cloud SQL Proxy configuration
# Check that Cloud Run has proper IAM permissions

# 4. Verify credentials in Secret Manager
gcloud secrets versions access latest --secret="database-url"

# 5. Check VPC connector (if using private IP)
gcloud compute networks vpc-access connectors describe linguamaster-connector \
  --region=us-central1
```

### Error: "GEMINI_API_KEY not configured"

**Symptoms**:
- AI features not working
- Lesson generation fails
- Health check shows Gemini down

**Diagnosis**:
```bash
# Check if secret exists
gcloud secrets describe gemini-api-key

# Check Cloud Run environment variables
gcloud run services describe linguamaster \
  --format="value(spec.template.spec.containers[0].env)"

# Test API key manually
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY"
```

**Common Causes**:
1. Secret not created in Secret Manager
2. Cloud Run not configured to use secret
3. Invalid or expired API key
4. Insufficient IAM permissions

**Resolution**:
```bash
# 1. Create secret
echo -n "your-api-key" | gcloud secrets create gemini-api-key --data-file=-

# 2. Grant Cloud Run access
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:linguamaster-sa@northerntriberesearch.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 3. Update Cloud Run to use secret
gcloud run services update linguamaster \
  --update-secrets=GEMINI_API_KEY=gemini-api-key:latest \
  --region=us-central1

# 4. Verify API key is valid
# Test in Google AI Studio: https://makersuite.google.com/
```

### Error: "Rate limit exceeded"

**Symptoms**:
- Users receiving 429 errors
- "Too many requests" messages
- Legitimate users blocked

**Diagnosis**:
```bash
# Check rate limit metrics
curl https://linguamaster.ai/api/metrics/summary | jq '.http'

# Check logs for rate limit hits
gcloud logging read "httpRequest.status=429" --limit=50

# Identify affected IPs
gcloud logging read "httpRequest.status=429" \
  --format="value(httpRequest.remoteIp)" | sort | uniq -c | sort -rn
```

**Common Causes**:
1. Legitimate traffic spike
2. Bot or scraper activity
3. Rate limits too restrictive
4. Client retry loops

**Resolution**:
```bash
# 1. Temporarily increase rate limits (if legitimate traffic)
# Edit server/middleware/security.ts
# Update rate limit configuration

# 2. Block malicious IPs (if bot activity)
# Add to Cloud Armor policy or firewall rules

# 3. Whitelist known good IPs
# Add to rate limiter whitelist

# 4. Contact affected users
# Provide guidance on API usage
```

### Error: "Memory limit exceeded"

**Symptoms**:
- Container restarts frequently
- OOM (Out of Memory) errors in logs
- Slow performance before crash

**Diagnosis**:
```bash
# Check memory usage
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/container/memory/utilizations"' \
  --format=json

# Check container logs for OOM
gcloud logging read "textPayload=~\"out of memory\"" --limit=50

# Check current memory limit
gcloud run services describe linguamaster \
  --format="value(spec.template.spec.containers[0].resources.limits.memory)"
```

**Common Causes**:
1. Memory leak in application code
2. Insufficient memory allocation
3. Large request payloads
4. Caching too much data in memory

**Resolution**:
```bash
# 1. Increase memory limit
gcloud run services update linguamaster \
  --memory=2Gi \
  --region=us-central1

# 2. Restart service to clear memory
gcloud run services update linguamaster \
  --region=us-central1 \
  --update-env-vars=RESTART_TIMESTAMP=$(date +%s)

# 3. Investigate memory leak
# Use Node.js heap profiling
# Review recent code changes

# 4. Optimize caching
# Review cache size limits in server/utils/cache.ts
```

### Error: "SSL certificate error"

**Symptoms**:
- HTTPS not working
- Certificate warnings in browser
- API requests failing with SSL errors

**Diagnosis**:
```bash
# Check certificate status
gcloud compute ssl-certificates describe linguamaster-cert

# Test SSL connection
openssl s_client -connect linguamaster.ai:443 -servername linguamaster.ai

# Check certificate expiration
echo | openssl s_client -connect linguamaster.ai:443 2>/dev/null | \
  openssl x509 -noout -dates
```

**Common Causes**:
1. Certificate expired
2. Certificate not properly configured
3. DNS not pointing to load balancer
4. Certificate domain mismatch

**Resolution**:
```bash
# 1. Renew certificate (if using managed certificate)
gcloud compute ssl-certificates create linguamaster-cert-new \
  --domains=linguamaster.ai,linguamaster.ntr-kenya.com \
  --global

# 2. Update load balancer to use new certificate
gcloud compute target-https-proxies update linguamaster-https-proxy \
  --ssl-certificates=linguamaster-cert-new

# 3. Verify DNS records
dig linguamaster.ai
dig linguamaster.ntr-kenya.com

# 4. Wait for certificate provisioning (can take up to 15 minutes)
gcloud compute ssl-certificates describe linguamaster-cert-new
```

## Database Connection Troubleshooting

### Symptom: Connection Pool Exhausted

**Diagnosis**:
```bash
# Check active connections
psql $DATABASE_URL -c "
  SELECT count(*), state 
  FROM pg_stat_activity 
  GROUP BY state;
"

# Check long-running queries
psql $DATABASE_URL -c "
  SELECT pid, now() - query_start as duration, query 
  FROM pg_stat_activity 
  WHERE state = 'active' 
  ORDER BY duration DESC;
"
```

**Resolution**:
```bash
# 1. Increase pool size in application
# Edit server/db.ts
# Update max pool size

# 2. Kill long-running queries
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = <PID>;"

# 3. Restart application to reset connections
gcloud run services update linguamaster --region=us-central1

# 4. Investigate connection leaks in code
# Review database query patterns
# Ensure connections are properly released
```

### Symptom: Slow Queries

**Diagnosis**:
```bash
# Enable slow query logging
gcloud sql instances patch linguamaster-db \
  --database-flags=log_min_duration_statement=1000

# View slow queries
gcloud sql operations list --instance=linguamaster-db --limit=10

# Check query performance
psql $DATABASE_URL -c "
  SELECT query, calls, total_time, mean_time 
  FROM pg_stat_statements 
  ORDER BY mean_time DESC 
  LIMIT 10;
"
```

**Resolution**:
```bash
# 1. Add missing indexes
psql $DATABASE_URL -c "
  CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
"

# 2. Analyze query plans
psql $DATABASE_URL -c "EXPLAIN ANALYZE <your-query>;"

# 3. Update table statistics
psql $DATABASE_URL -c "ANALYZE;"

# 4. Consider query optimization
# Review and rewrite inefficient queries
```

### Symptom: Database Disk Full

**Diagnosis**:
```bash
# Check disk usage
gcloud sql instances describe linguamaster-db \
  --format="value(settings.dataDiskSizeGb,currentDiskSize)"

# Check database size
psql $DATABASE_URL -c "
  SELECT pg_size_pretty(pg_database_size(current_database()));
"

# Check table sizes
psql $DATABASE_URL -c "
  SELECT schemaname, tablename, 
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables 
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
  LIMIT 10;
"
```

**Resolution**:
```bash
# 1. Increase disk size
gcloud sql instances patch linguamaster-db \
  --storage-size=50GB

# 2. Clean up old data
psql $DATABASE_URL -c "DELETE FROM logs WHERE created_at < NOW() - INTERVAL '90 days';"

# 3. Vacuum database
psql $DATABASE_URL -c "VACUUM FULL;"

# 4. Archive old data
# Export and remove historical data
```

## AI Service Integration Troubleshooting

### Symptom: Gemini API Errors

**Diagnosis**:
```bash
# Check API key validity
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"

# Check recent errors
gcloud logging read "jsonPayload.service=\"gemini\"" --limit=50

# Check rate limits
curl https://linguamaster.ai/api/metrics/summary | jq '.ai.gemini'
```

**Common Error Codes**:
- **400**: Invalid request format
- **401**: Invalid API key
- **403**: API not enabled or quota exceeded
- **429**: Rate limit exceeded
- **500**: Internal server error

**Resolution**:
```bash
# 1. Verify API key
# Check in Google Cloud Console > APIs & Services > Credentials

# 2. Enable Generative Language API
gcloud services enable generativelanguage.googleapis.com

# 3. Check quota limits
# Visit Google Cloud Console > APIs & Services > Quotas

# 4. Implement retry logic with exponential backoff
# Review server/services/GeminiService.ts

# 5. Implement circuit breaker
# Review server/utils/AIServiceMonitor.ts
```

### Symptom: OpenAI API Errors

**Diagnosis**:
```bash
# Check API key validity
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check recent errors
gcloud logging read "jsonPayload.service=\"openai\"" --limit=50

# Check usage
curl https://linguamaster.ai/api/metrics/summary | jq '.ai.openai'
```

**Resolution**:
```bash
# 1. Verify API key in OpenAI dashboard
# https://platform.openai.com/api-keys

# 2. Check billing and usage limits
# https://platform.openai.com/account/billing

# 3. Implement fallback to Gemini
# Review server/services/AITeacherService.ts

# 4. Monitor token usage
# Set up alerts for high usage
```

## Performance Issue Diagnosis

### Symptom: High Response Times

**Diagnosis**:
```bash
# Check p95 response times
curl https://linguamaster.ai/api/metrics/summary | jq '.http.p95Duration'

# Check slow endpoints
gcloud logging read "httpRequest.latency>\"2s\"" --limit=50

# Check database query times
curl https://linguamaster.ai/api/metrics/summary | jq '.database.avgDuration'

# Check external API times
curl https://linguamaster.ai/api/metrics/summary | jq '.ai'
```

**Resolution Steps**:
1. Identify bottleneck (app, database, external API)
2. Scale resources if needed
3. Optimize slow queries
4. Implement caching
5. Add CDN for static assets

### Symptom: High CPU Usage

**Diagnosis**:
```bash
# Check CPU utilization
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/container/cpu/utilizations"'

# Check CPU-intensive operations in logs
gcloud logging read "jsonPayload.duration>1000" --limit=50
```

**Resolution**:
```bash
# 1. Increase CPU allocation
gcloud run services update linguamaster \
  --cpu=2 \
  --region=us-central1

# 2. Optimize CPU-intensive operations
# Profile application code
# Optimize algorithms

# 3. Scale horizontally
gcloud run services update linguamaster \
  --max-instances=20 \
  --region=us-central1
```

## Log Locations and Interpretation

### Application Logs

**Location**: Cloud Logging
```bash
# View all logs
gcloud logging read "resource.type=cloud_run_revision" --limit=100

# Filter by severity
gcloud logging read "severity>=WARNING" --limit=50

# Filter by time
gcloud logging read "timestamp>=\"2024-01-15T14:00:00Z\"" --limit=100
```

**Log Format** (JSON):
```json
{
  "timestamp": "2024-01-15T14:23:45.123Z",
  "level": "ERROR",
  "message": "Database query failed",
  "service": "linguamaster-api",
  "meta": {
    "query": "SELECT * FROM users WHERE id = $1",
    "error": "connection timeout",
    "duration": 5000
  }
}
```

### Database Logs

**Location**: Cloud SQL Logs
```bash
# View database logs
gcloud sql operations list --instance=linguamaster-db --limit=10

# View slow query log
gcloud logging read "resource.type=cloudsql_database AND severity>=WARNING"
```

### Access Logs

**Location**: Cloud Run Request Logs
```bash
# View access logs
gcloud logging read "resource.type=cloud_run_revision AND httpRequest.requestUrl!=\"\"" --limit=100

# Filter by status code
gcloud logging read "httpRequest.status>=400" --limit=50

# Filter by path
gcloud logging read "httpRequest.requestUrl=~\"/api/lessons\"" --limit=50
```

## Troubleshooting Flowcharts

### Service Unavailable Flowchart

```
Is health check passing?
├─ No
│  ├─ Is Cloud Run service running?
│  │  ├─ No → Start service
│  │  └─ Yes → Check application logs
│  └─ Check which dependency is down
│     ├─ Database → Troubleshoot database
│     ├─ Gemini → Check API key and quota
│     └─ OpenAI → Check API key and billing
└─ Yes
   └─ Check if issue is intermittent
      ├─ Yes → Check for rate limiting
      └─ No → Issue may be resolved
```

### High Error Rate Flowchart

```
What is the error rate?
├─ > 5%
│  ├─ Recent deployment?
│  │  ├─ Yes → Rollback immediately
│  │  └─ No → Check error patterns
│  └─ Identify error type
│     ├─ 500 errors → Check application logs
│     ├─ 429 errors → Check rate limits
│     └─ 503 errors → Check dependencies
└─ 1-5%
   └─ Monitor and investigate
      ├─ Check error patterns
      ├─ Review recent changes
      └─ Implement fixes
```

### Performance Degradation Flowchart

```
What is the p95 response time?
├─ > 5s (Critical)
│  ├─ Check database query times
│  │  ├─ Slow → Optimize queries
│  │  └─ Normal → Check external APIs
│  └─ Scale resources immediately
└─ 2-5s (Warning)
   └─ Identify bottleneck
      ├─ Database → Add indexes, optimize queries
      ├─ External API → Implement caching
      └─ Application → Profile and optimize code
```

## Useful Commands Reference

### Cloud Run
```bash
# Describe service
gcloud run services describe linguamaster --region=us-central1

# List revisions
gcloud run revisions list --service=linguamaster --region=us-central1

# Update service
gcloud run services update linguamaster --region=us-central1

# View logs
gcloud run services logs read linguamaster --region=us-central1

# Scale service
gcloud run services update linguamaster \
  --min-instances=1 \
  --max-instances=10 \
  --region=us-central1
```

### Cloud SQL
```bash
# Describe instance
gcloud sql instances describe linguamaster-db

# Connect to database
gcloud sql connect linguamaster-db --user=postgres

# List operations
gcloud sql operations list --instance=linguamaster-db

# Restart instance
gcloud sql instances restart linguamaster-db
```

### Secrets Manager
```bash
# List secrets
gcloud secrets list

# View secret value
gcloud secrets versions access latest --secret="database-url"

# Create secret
echo -n "secret-value" | gcloud secrets create my-secret --data-file=-

# Update secret
echo -n "new-value" | gcloud secrets versions add my-secret --data-file=-
```

### Monitoring
```bash
# List metrics
gcloud monitoring metrics-descriptors list

# Query time series
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count"'

# Create alert policy
gcloud alpha monitoring policies create --notification-channels=CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-display-name="Error rate > 1%" \
  --condition-threshold-value=0.01
```

## Contact Information

- **On-Call Engineer**: See PagerDuty schedule
- **DevOps Lead**: devops@linguamaster.ai
- **Database Admin**: dba@linguamaster.ai
- **Security Team**: security@linguamaster.ai

## Related Documentation

- [Deployment Runbook](./deployment.md)
- [Incident Response Procedures](./incident-response.md)
- [Architecture Documentation](../architecture/overview.md)
- [API Documentation](../api/README.md)
