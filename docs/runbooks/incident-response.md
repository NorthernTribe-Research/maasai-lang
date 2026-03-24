# Incident Response Procedures

**Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7**

## Overview

This runbook defines procedures for responding to production incidents affecting the LinguaMaster platform.

## Incident Severity Levels

### Severity 1 (Critical)
**Response Time**: Immediate (< 15 minutes)
**Resolution Target**: < 4 hours

**Criteria**:
- Complete service outage
- Data loss or corruption
- Security breach
- Payment system failure
- Affects > 50% of users

**Examples**:
- Database unavailable
- Application crashes on startup
- DDoS attack in progress
- Data breach detected

### Severity 2 (High)
**Response Time**: < 30 minutes
**Resolution Target**: < 8 hours

**Criteria**:
- Major feature unavailable
- Significant performance degradation
- Affects 10-50% of users
- Workaround available

**Examples**:
- AI services unavailable
- Authentication issues
- Slow response times (> 5s)
- Payment processing delayed

### Severity 3 (Medium)
**Response Time**: < 2 hours
**Resolution Target**: < 24 hours

**Criteria**:
- Minor feature unavailable
- Affects < 10% of users
- Workaround available
- No data loss

**Examples**:
- Single lesson type broken
- UI rendering issues
- Non-critical API errors
- Email delivery delays

### Severity 4 (Low)
**Response Time**: < 1 business day
**Resolution Target**: < 1 week

**Criteria**:
- Cosmetic issues
- Affects < 1% of users
- No functional impact

**Examples**:
- Typos in UI
- Minor styling issues
- Non-critical logging errors

## Incident Response Workflow

### 1. Detection

**Automated Detection**:
- Monitoring alerts (error rate, response time, uptime)
- Health check failures
- Error tracking notifications (Sentry)
- User reports via support channels

**Manual Detection**:
- User complaints on social media
- Support ticket surge
- Team member observation

### 2. Declaration

**Who Can Declare**:
- On-call engineer
- Engineering manager
- DevOps lead
- Any engineer for Sev 1

**Declaration Steps**:
1. Create incident in incident management system
2. Assign severity level
3. Notify incident response team
4. Create incident Slack channel: `#incident-YYYY-MM-DD-description`
5. Start incident timeline document

**Incident Channel Template**:
```
🚨 INCIDENT DECLARED

**Severity**: 1 (Critical)
**Title**: Database Connection Failures
**Detected**: 2024-01-15 14:23 UTC
**Impact**: Users unable to login or access lessons
**Incident Commander**: @john.doe
**Timeline Doc**: [link]

**Current Status**: Investigating
```

### 3. Assessment

**Initial Assessment** (< 5 minutes):
1. Verify incident is real (not false alarm)
2. Determine scope and impact
3. Identify affected systems
4. Estimate user impact
5. Check for related incidents

**Assessment Checklist**:
- [ ] What is broken?
- [ ] How many users affected?
- [ ] What is the business impact?
- [ ] Is data at risk?
- [ ] Are there security implications?
- [ ] What changed recently?

### 4. Response

**Incident Commander Responsibilities**:
- Coordinate response efforts
- Make decisions on mitigation strategies
- Communicate with stakeholders
- Maintain incident timeline
- Declare incident resolved

**Response Team Roles**:
- **Incident Commander**: Overall coordination
- **Technical Lead**: Hands-on investigation and fixes
- **Communications Lead**: Stakeholder updates
- **Customer Support Lead**: User communication

**Response Actions**:
1. Assign roles
2. Begin investigation
3. Implement mitigation
4. Monitor impact
5. Communicate progress

### 5. Mitigation

**Mitigation Strategies** (in order of preference):
1. **Quick Fix**: Apply hotfix if root cause known
2. **Rollback**: Revert to last known good state
3. **Failover**: Switch to backup systems
4. **Disable Feature**: Turn off broken feature
5. **Scale Resources**: Add capacity if resource issue
6. **Manual Intervention**: Temporary manual processes

**Mitigation Checklist**:
- [ ] Identify root cause (or working hypothesis)
- [ ] Evaluate mitigation options
- [ ] Assess risks of each option
- [ ] Get approval for chosen approach
- [ ] Implement mitigation
- [ ] Verify mitigation effectiveness
- [ ] Monitor for side effects

### 6. Resolution

**Resolution Criteria**:
- Root cause identified and fixed
- Service restored to normal operation
- No ongoing user impact
- Monitoring shows normal metrics
- Team consensus on resolution

**Resolution Steps**:
1. Verify all systems healthy
2. Confirm user impact resolved
3. Document resolution actions
4. Update incident status
5. Notify stakeholders
6. Schedule post-mortem

### 7. Post-Incident Review

**Timing**: Within 48 hours of resolution

**Attendees**:
- Incident response team
- Engineering leadership
- Product management
- Customer support

**Post-Mortem Template**:
```markdown
# Incident Post-Mortem: [Title]

## Incident Summary
- **Date**: 2024-01-15
- **Duration**: 2 hours 15 minutes
- **Severity**: 1 (Critical)
- **Impact**: 5,000 users unable to access platform

## Timeline
- 14:23 UTC: Incident detected via monitoring alert
- 14:25 UTC: Incident declared, team notified
- 14:30 UTC: Root cause identified (database connection pool exhausted)
- 14:45 UTC: Mitigation implemented (increased pool size)
- 15:00 UTC: Service restored
- 16:38 UTC: Incident resolved

## Root Cause
Database connection pool size (10) insufficient for traffic spike.
Connection leak in new feature code prevented pool recycling.

## Impact
- 5,000 users unable to login
- 2,000 active sessions terminated
- $500 estimated revenue loss
- 150 support tickets created

## What Went Well
- Fast detection (< 2 minutes)
- Clear communication
- Effective mitigation
- No data loss

## What Went Wrong
- Connection leak not caught in code review
- Load testing didn't simulate this scenario
- Monitoring didn't alert on connection pool usage

## Action Items
1. [ ] Add connection pool monitoring (Owner: @alice, Due: 2024-01-20)
2. [ ] Fix connection leak in feature code (Owner: @bob, Due: 2024-01-16)
3. [ ] Improve load testing scenarios (Owner: @charlie, Due: 2024-01-25)
4. [ ] Add connection pool size to runbook (Owner: @dave, Due: 2024-01-17)
5. [ ] Review all database code for leaks (Owner: @eve, Due: 2024-01-30)
```

## Escalation Procedures

### Severity 1 Escalation Path

**Immediate** (< 15 minutes):
1. On-call engineer
2. Engineering manager
3. VP Engineering
4. CTO

**Notification Method**: Phone call + Slack

### Severity 2 Escalation Path

**< 30 minutes**:
1. On-call engineer
2. Engineering manager
3. VP Engineering (if not resolved in 2 hours)

**Notification Method**: Slack + Email

### Severity 3 Escalation Path

**< 2 hours**:
1. On-call engineer
2. Engineering manager (if not resolved in 4 hours)

**Notification Method**: Slack

### Severity 4 Escalation Path

**< 1 business day**:
1. Assigned engineer
2. Engineering manager (if not resolved in 1 week)

**Notification Method**: Ticket system

## Communication Templates

### Internal Status Update

**Frequency**: Every 30 minutes for Sev 1, hourly for Sev 2

**Template**:
```
📊 INCIDENT UPDATE #3

**Time**: 15:00 UTC
**Status**: Mitigation in progress
**Impact**: Still affecting ~3,000 users

**Progress**:
- Root cause identified: database connection pool exhaustion
- Mitigation: Increased pool size from 10 to 50
- Observing: Connection count stabilizing

**Next Steps**:
- Monitor for 15 minutes
- If stable, declare resolved
- Begin post-mortem preparation

**ETA**: 15-30 minutes to resolution
```

### External Status Update (Status Page)

**Template**:
```
🔴 Service Disruption

We are currently experiencing issues with user authentication and lesson access.

**Impact**: Some users may be unable to login or access lessons
**Status**: We have identified the issue and are implementing a fix
**ETA**: We expect full service restoration within 30 minutes

We apologize for the inconvenience and will provide updates every 15 minutes.

Last updated: 2024-01-15 15:00 UTC
```

### Resolution Announcement

**Template**:
```
✅ INCIDENT RESOLVED

**Incident**: Database Connection Failures
**Duration**: 2 hours 15 minutes (14:23 - 16:38 UTC)
**Impact**: Users unable to login or access lessons

**Resolution**: 
We have resolved the database connection issue. All services are now operating normally.

**Root Cause**: 
A connection pool exhaustion issue caused by higher than expected traffic.

**Prevention**:
We have increased our connection pool capacity and added monitoring to prevent recurrence.

**Apology**:
We sincerely apologize for the disruption and any inconvenience caused.

**Post-Mortem**:
A detailed post-mortem will be published within 48 hours.
```

## Common Incident Scenarios

### Scenario 1: Complete Service Outage

**Symptoms**:
- Health checks failing
- All requests returning 503
- Users cannot access site

**Investigation**:
```bash
# Check Cloud Run service status
gcloud run services describe linguamaster --region=us-central1

# Check recent deployments
gcloud run revisions list --service=linguamaster --region=us-central1

# Check logs for errors
gcloud logging read "severity>=ERROR" --limit=100
```

**Common Causes**:
- Failed deployment
- Database unavailable
- Configuration error
- Resource exhaustion

**Mitigation**:
1. Check if recent deployment: rollback
2. Check database: restart or failover
3. Check configuration: fix and redeploy
4. Check resources: scale up

### Scenario 2: High Error Rate

**Symptoms**:
- Error rate > 1%
- Sentry alerts firing
- User complaints

**Investigation**:
```bash
# Check error logs
gcloud logging read "severity=ERROR" --limit=100

# Check Sentry for error patterns
# Review recent code changes
```

**Common Causes**:
- Bug in new code
- External API failure
- Database query issues
- Rate limiting

**Mitigation**:
1. If new code: rollback
2. If external API: implement fallback
3. If database: optimize queries
4. If rate limiting: adjust limits

### Scenario 3: Performance Degradation

**Symptoms**:
- Response times > 2s
- Slow page loads
- Timeout errors

**Investigation**:
```bash
# Check Cloud Run metrics
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_latencies"'

# Check database performance
# Check external API response times
```

**Common Causes**:
- Database slow queries
- External API slowness
- Insufficient resources
- Memory leak

**Mitigation**:
1. Scale up instances
2. Optimize slow queries
3. Implement caching
4. Restart service if memory leak

### Scenario 4: Database Issues

**Symptoms**:
- Database connection errors
- Query timeouts
- Data inconsistencies

**Investigation**:
```bash
# Check Cloud SQL status
gcloud sql instances describe linguamaster-db

# Check connection pool
# Review slow query log
```

**Common Causes**:
- Connection pool exhaustion
- Slow queries
- Disk space full
- Replication lag

**Mitigation**:
1. Increase connection pool
2. Kill long-running queries
3. Add disk space
4. Promote replica if needed

### Scenario 5: Security Incident

**Symptoms**:
- Unusual traffic patterns
- Unauthorized access attempts
- Data breach indicators

**Investigation**:
```bash
# Check access logs
gcloud logging read "httpRequest.status>=400" --limit=100

# Review authentication logs
# Check for SQL injection attempts
```

**Immediate Actions**:
1. Isolate affected systems
2. Revoke compromised credentials
3. Enable additional logging
4. Notify security team
5. Preserve evidence

**Mitigation**:
1. Block malicious IPs
2. Rotate all credentials
3. Apply security patches
4. Conduct security audit

## Tools and Resources

### Monitoring Dashboards
- **Cloud Console**: https://console.cloud.google.com/run
- **Metrics Dashboard**: https://console.cloud.google.com/monitoring
- **Logs Explorer**: https://console.cloud.google.com/logs

### Incident Management
- **Incident Channel**: #incidents
- **On-Call Schedule**: PagerDuty
- **Status Page**: status.linguamaster.ai

### Documentation
- [Deployment Runbook](./deployment.md)
- [Troubleshooting Guide](./troubleshooting.md)
- [Architecture Documentation](../architecture/overview.md)

### Contact Information
- **On-Call Engineer**: See PagerDuty schedule
- **Engineering Manager**: engineering@linguamaster.ai
- **DevOps Lead**: devops@linguamaster.ai
- **Security Team**: security@linguamaster.ai
- **Customer Support**: support@linguamaster.ai

## Appendix: Incident Response Checklist

### Detection Phase
- [ ] Incident detected
- [ ] Severity assessed
- [ ] Impact estimated

### Declaration Phase
- [ ] Incident declared
- [ ] Incident channel created
- [ ] Team notified
- [ ] Timeline started

### Response Phase
- [ ] Incident commander assigned
- [ ] Roles assigned
- [ ] Investigation started
- [ ] Stakeholders notified

### Mitigation Phase
- [ ] Root cause identified
- [ ] Mitigation strategy chosen
- [ ] Mitigation implemented
- [ ] Effectiveness verified

### Resolution Phase
- [ ] Service restored
- [ ] Monitoring normal
- [ ] Users notified
- [ ] Incident closed

### Post-Incident Phase
- [ ] Post-mortem scheduled
- [ ] Action items created
- [ ] Documentation updated
- [ ] Lessons learned shared
