# Production Deployment Runbook

**Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7**

## Overview

This runbook provides step-by-step procedures for deploying the LinguaMaster platform to production on Google Cloud Run.

## Pre-Deployment Checklist

Before initiating a production deployment, verify the following:

- [ ] All tests passing in CI/CD pipeline
- [ ] Code review completed and approved
- [ ] Staging deployment successful and tested
- [ ] Database migrations tested in staging
- [ ] No critical bugs or security issues
- [ ] Monitoring and alerting configured
- [ ] Rollback plan prepared
- [ ] Team notified of deployment window
- [ ] On-call engineer identified
- [ ] Backup verification completed

## Required Access and Permissions

### Google Cloud Platform
- **Project**: northerntriberesearch
- **Region**: us-central1
- **Required Roles**:
  - Cloud Run Admin
  - Cloud SQL Admin
  - Secret Manager Admin
  - Artifact Registry Writer
  - Service Account User

### GitLab
- **Repository**: LinguaMaster
- **Required Permissions**:
  - Maintainer role (for manual deployment triggers)
  - Access to CI/CD variables

### Credentials
- GCP Service Account Key (for manual deployments)
- GitLab Personal Access Token (for API access)
- Database credentials (stored in Secret Manager)
- AI API keys (stored in Secret Manager)

## Deployment Procedures

### Automated Deployment (Recommended)

#### Step 1: Trigger Deployment Pipeline
**Estimated Time**: 15-20 minutes

1. Navigate to GitLab CI/CD Pipelines
2. Locate the pipeline for the target commit/tag
3. Click "Run Pipeline" for production stage
4. Confirm deployment in modal dialog

**Expected Output**: Pipeline starts and progresses through stages

#### Step 2: Monitor Pipeline Execution
**Estimated Time**: 15-20 minutes

Monitor the following stages:
1. **Lint & Type Check** (2-3 min)
   - TypeScript compilation
   - ESLint checks
   
2. **Unit Tests** (3-5 min)
   - All unit tests must pass
   - Coverage report generated
   
3. **Security Scan** (2-3 min)
   - Dependency vulnerability scan
   - SAST analysis
   
4. **Build Docker Image** (5-7 min)
   - Multi-stage build
   - Image tagged with commit SHA
   - Pushed to Artifact Registry
   
5. **Deploy to Production** (3-5 min)
   - Cloud Run service updated
   - Traffic gradually shifted (canary deployment)
   - Health checks monitored

**Expected Output**: All stages complete successfully

#### Step 3: Verify Deployment
**Estimated Time**: 5-10 minutes

1. Check Cloud Run service status:
   ```bash
   gcloud run services describe linguamaster \
     --region=us-central1 \
     --project=northerntriberesearch
   ```

2. Verify health endpoint:
   ```bash
   curl https://linguamaster.ai/api/health
   ```
   
   Expected response:
   ```json
   {
     "status": "healthy",
     "dependencies": {
       "database": { "status": "up" },
       "gemini": { "status": "up" },
       "openai": { "status": "up" }
     }
   }
   ```

3. Run smoke tests:
   ```bash
   ./scripts/smoke-test.sh production
   ```

4. Check application logs:
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=linguamaster" \
     --limit=50 \
     --project=northerntriberesearch
   ```

5. Monitor error rates in Cloud Console
6. Verify metrics in monitoring dashboard

**Expected Output**: All checks pass, no errors in logs

### Manual Deployment (Emergency Only)

#### Prerequisites
```bash
# Authenticate with GCP
gcloud auth login
gcloud config set project northerntriberesearch

# Set environment variables
export PROJECT_ID=northerntriberesearch
export REGION=us-central1
export SERVICE_NAME=linguamaster
export IMAGE_TAG=$(git rev-parse --short HEAD)
```

#### Step 1: Build Docker Image
```bash
# Build image
docker build -t gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${IMAGE_TAG} .

# Push to Artifact Registry
docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}:${IMAGE_TAG}
```

#### Step 2: Deploy to Cloud Run
```bash
./scripts/deploy-manual.sh ${IMAGE_TAG}
```

#### Step 3: Verify Deployment
Follow verification steps from automated deployment section.

## Post-Deployment Verification

### Critical User Flows

Test the following critical flows manually:

1. **User Authentication**
   - [ ] User registration
   - [ ] User login
   - [ ] Password reset
   - [ ] Google OAuth login

2. **Learning Features**
   - [ ] View lessons
   - [ ] Complete exercises
   - [ ] AI tutor interaction
   - [ ] Voice practice

3. **Progress Tracking**
   - [ ] XP accumulation
   - [ ] Streak tracking
   - [ ] Leaderboard updates
   - [ ] Achievement unlocks

### Performance Verification

1. Check response times:
   ```bash
   # Should be < 2 seconds for p95
   curl -w "@curl-format.txt" -o /dev/null -s https://linguamaster.ai/api/health
   ```

2. Monitor Cloud Run metrics:
   - Request count
   - Request latency (p50, p95, p99)
   - Error rate
   - Instance count

3. Check database performance:
   - Connection pool usage
   - Query latency
   - Slow query log

### Monitoring Verification

1. Verify alerts are active:
   - Error rate alerts
   - Response time alerts
   - Resource utilization alerts

2. Check log aggregation:
   - Logs flowing to Cloud Logging
   - Structured log format
   - No sensitive data in logs

3. Verify error tracking:
   - Sentry receiving errors
   - Error grouping working
   - Notifications configured

## Rollback Procedures

### When to Rollback

Initiate rollback if:
- Error rate exceeds 1% for 5 minutes
- Critical functionality broken
- Performance degradation > 50%
- Security vulnerability discovered
- Database corruption detected

### Rollback Steps

#### Automated Rollback
**Estimated Time**: 3-5 minutes

1. Navigate to GitLab CI/CD Pipelines
2. Find the last successful production deployment
3. Click "Rollback" button
4. Confirm rollback

#### Manual Rollback
**Estimated Time**: 3-5 minutes

```bash
# List recent revisions
gcloud run revisions list \
  --service=linguamaster \
  --region=us-central1 \
  --project=northerntriberesearch

# Rollback to previous revision
./scripts/staging-rollback.sh <REVISION_NAME>

# Verify rollback
curl https://linguamaster.ai/api/health
```

### Post-Rollback Actions

1. Verify system health
2. Notify team of rollback
3. Document rollback reason
4. Create incident report
5. Schedule post-mortem
6. Fix issues before next deployment

### Database Rollback Assessment

If deployment included database migrations:

1. Check if migration is reversible:
   ```bash
   # Review migration down() function
   cat db/migrations/<migration_file>.ts
   ```

2. If data was modified, assess data integrity:
   - Check for data loss
   - Verify referential integrity
   - Test critical queries

3. If rollback needed:
   ```bash
   # Rollback migration
   npm run db:migrate:down
   
   # Verify database state
   npm run db:verify
   ```

4. If migration cannot be rolled back:
   - Restore from backup
   - Apply forward-fix migration
   - Document data recovery steps

## Communication Procedures

### Pre-Deployment Notification

**Audience**: Engineering team, stakeholders
**Channel**: Slack #deployments
**Timing**: 1 hour before deployment

**Template**:
```
🚀 Production Deployment Starting

**Service**: LinguaMaster Platform
**Version**: v1.2.3 (commit: abc123)
**Scheduled Time**: 2024-01-15 14:00 UTC
**Estimated Duration**: 20 minutes
**Expected Impact**: None (zero-downtime deployment)
**Rollback Plan**: Automated rollback available

**Changes**:
- Feature: New lesson types
- Fix: Performance optimization
- Security: Updated dependencies

**On-Call Engineer**: @john.doe
```

### Deployment In-Progress

**Audience**: Engineering team
**Channel**: Slack #deployments
**Timing**: Real-time updates

**Updates**:
- Pipeline stage completions
- Any warnings or issues
- Traffic shift progress

### Deployment Complete

**Audience**: Engineering team, stakeholders
**Channel**: Slack #deployments
**Timing**: Immediately after verification

**Template**:
```
✅ Production Deployment Complete

**Service**: LinguaMaster Platform
**Version**: v1.2.3 (commit: abc123)
**Completed**: 2024-01-15 14:18 UTC
**Duration**: 18 minutes
**Status**: Successful

**Verification**:
✅ Health checks passing
✅ Smoke tests passed
✅ Error rate normal
✅ Performance within SLA

**Monitoring**: https://console.cloud.google.com/run/detail/us-central1/linguamaster
```

### Rollback Notification

**Audience**: Engineering team, stakeholders, leadership
**Channel**: Slack #incidents
**Timing**: Immediately

**Template**:
```
⚠️ Production Rollback Initiated

**Service**: LinguaMaster Platform
**From Version**: v1.2.3 (commit: abc123)
**To Version**: v1.2.2 (commit: def456)
**Reason**: High error rate detected
**Initiated By**: @john.doe
**Status**: In progress

**Impact**: Users may experience brief service interruption

**Next Steps**:
1. Complete rollback
2. Verify system health
3. Create incident report
4. Schedule post-mortem
```

## Troubleshooting

### Deployment Fails at Build Stage

**Symptoms**: Docker build fails, image not created

**Diagnosis**:
```bash
# Check build logs
gcloud builds log <BUILD_ID>

# Common issues:
# - Dependency installation failure
# - TypeScript compilation errors
# - Out of memory during build
```

**Resolution**:
1. Fix code issues locally
2. Test build locally: `docker build .`
3. Push fix and retry deployment

### Deployment Fails at Deploy Stage

**Symptoms**: Cloud Run deployment fails, service not updated

**Diagnosis**:
```bash
# Check Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# Common issues:
# - Container fails to start
# - Health check failures
# - Insufficient permissions
# - Resource limits exceeded
```

**Resolution**:
1. Check container logs for startup errors
2. Verify environment variables and secrets
3. Check resource limits (memory, CPU)
4. Verify service account permissions

### High Error Rate After Deployment

**Symptoms**: Error rate > 1%, alerts firing

**Diagnosis**:
```bash
# Check error logs
gcloud logging read "severity>=ERROR" --limit=100

# Check specific error patterns
gcloud logging read "jsonPayload.error=~'.*'" --limit=50
```

**Resolution**:
1. Identify error pattern
2. If widespread: initiate rollback
3. If isolated: apply hotfix
4. Monitor error rate

### Performance Degradation

**Symptoms**: Response times > 2s, slow page loads

**Diagnosis**:
```bash
# Check Cloud Run metrics
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_latencies"'

# Check database performance
# Review slow query log
```

**Resolution**:
1. Identify bottleneck (app, database, external API)
2. Scale Cloud Run instances if needed
3. Optimize slow queries
4. Consider rollback if severe

## Deployment Schedule

### Recommended Deployment Windows

- **Primary**: Tuesday-Thursday, 10:00-16:00 UTC
- **Avoid**: Fridays, weekends, holidays
- **Emergency**: Any time with on-call approval

### Deployment Frequency

- **Regular releases**: Weekly (Tuesdays)
- **Hotfixes**: As needed
- **Security patches**: Within 24 hours of disclosure

## Appendix

### Useful Commands

```bash
# View service details
gcloud run services describe linguamaster --region=us-central1

# View recent revisions
gcloud run revisions list --service=linguamaster --region=us-central1

# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# Update traffic split
gcloud run services update-traffic linguamaster \
  --to-revisions=REVISION-001=50,REVISION-002=50 \
  --region=us-central1

# Scale service
gcloud run services update linguamaster \
  --min-instances=1 \
  --max-instances=10 \
  --region=us-central1
```

### Contact Information

- **On-Call Engineer**: See PagerDuty schedule
- **DevOps Lead**: devops@linguamaster.ai
- **Engineering Manager**: engineering@linguamaster.ai
- **Incident Commander**: incidents@linguamaster.ai

### Related Documentation

- [Incident Response Procedures](./incident-response.md)
- [Troubleshooting Guide](./troubleshooting.md)
- [Architecture Documentation](../architecture/overview.md)
- [API Documentation](../api/README.md)
