# Data Retention Policy

**Last Updated**: January 2024

**Requirements: 37.1, 37.2, 37.3, 37.4, 37.5, 37.6, 37.7**

## Overview

This Data Retention Policy defines how long LinguaMaster retains different types of data and the procedures for data deletion. This policy ensures compliance with legal requirements while respecting user privacy.

## Retention Periods by Data Type

### User Account Data

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Active user accounts | While account is active | Service provision |
| Inactive user accounts | 2 years after last login | Regulatory compliance |
| Deleted user accounts | 30 days (soft delete) | Allow account recovery |
| Email addresses (deleted accounts) | Hashed for 1 year | Prevent re-registration abuse |

**Deletion Trigger**: Automatic deletion after retention period expires

### Authentication Data

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Password hashes | While account is active | Authentication |
| Session tokens | 7 days or until logout | Session management |
| JWT tokens | Until expiration (7 days) | Authentication |
| OAuth tokens | Until revoked or expired | Third-party authentication |
| Login history | 90 days | Security monitoring |
| Failed login attempts | 24 hours | Brute force protection |

**Deletion Trigger**: Automatic deletion after retention period expires

### Learning Data

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Lesson progress | While account is active | Service provision |
| Exercise responses | While account is active | Progress tracking |
| Quiz scores | While account is active | Analytics |
| Learning streaks | While account is active | Gamification |
| Achievements | While account is active | User engagement |
| Voice recordings | 30 days (unless saved) | Pronunciation practice |
| Saved voice recordings | While account is active | User preference |
| AI tutor conversations | 90 days | Context maintenance |

**Deletion Trigger**: Automatic deletion after retention period expires

### Usage and Analytics Data

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Session logs | 90 days | Analytics and debugging |
| Error logs | 1 year | Debugging and improvement |
| Performance metrics | 1 year | Performance monitoring |
| Feature usage data | 1 year | Product analytics |
| A/B test data | 1 year after test ends | Statistical analysis |
| Crash reports | 90 days | Bug fixing |

**Deletion Trigger**: Automatic deletion after retention period expires

### Financial Data (If Applicable)

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Transaction records | 7 years | Tax and legal compliance |
| Invoice data | 7 years | Accounting requirements |
| Payment method details | Until removed by user | Payment processing |
| Refund records | 7 years | Financial auditing |
| Subscription history | 7 years | Legal compliance |

**Deletion Trigger**: Manual review after retention period expires

### Communication Data

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Support tickets | 3 years | Customer service |
| Email correspondence | 3 years | Record keeping |
| In-app messages | 90 days | Communication history |
| Notification history | 30 days | Delivery tracking |
| Marketing emails | Until unsubscribe | Marketing compliance |

**Deletion Trigger**: Automatic deletion after retention period expires

### System and Security Data

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Access logs | 1 year | Security auditing |
| Security incident logs | 7 years | Legal compliance |
| Audit trails | 7 years | Compliance |
| IP addresses | 90 days | Fraud prevention |
| Device fingerprints | 90 days | Security |
| Rate limiting data | 24 hours | Abuse prevention |

**Deletion Trigger**: Automatic deletion after retention period expires

### Backup Data

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| Daily backups | 30 days | Disaster recovery |
| Weekly backups | 12 weeks | Extended recovery |
| Monthly backups | 12 months | Long-term recovery |
| Point-in-time recovery | 7 days | Database recovery |

**Deletion Trigger**: Automatic deletion after retention period expires

## Automated Deletion Procedures

### Daily Deletion Jobs

**Schedule**: Runs daily at 02:00 UTC

**Deletes**:
- Expired session tokens
- Failed login attempts older than 24 hours
- Rate limiting data older than 24 hours
- Notification history older than 30 days

**Implementation**:
```typescript
// server/jobs/daily-cleanup.ts
async function dailyCleanup() {
  await deleteExpiredSessions();
  await deleteOldFailedLogins();
  await deleteOldRateLimitData();
  await deleteOldNotifications();
}
```

### Weekly Deletion Jobs

**Schedule**: Runs weekly on Sunday at 03:00 UTC

**Deletes**:
- Voice recordings older than 30 days (unsaved)
- Session logs older than 90 days
- AI tutor conversations older than 90 days
- IP addresses older than 90 days
- Device fingerprints older than 90 days
- Crash reports older than 90 days

**Implementation**:
```typescript
// server/jobs/weekly-cleanup.ts
async function weeklyCleanup() {
  await deleteOldVoiceRecordings();
  await deleteOldSessionLogs();
  await deleteOldAIConversations();
  await deleteOldIPAddresses();
  await deleteOldCrashReports();
}
```

### Monthly Deletion Jobs

**Schedule**: Runs monthly on the 1st at 04:00 UTC

**Deletes**:
- Error logs older than 1 year
- Performance metrics older than 1 year
- Feature usage data older than 1 year
- A/B test data older than 1 year (after test completion)
- Access logs older than 1 year

**Implementation**:
```typescript
// server/jobs/monthly-cleanup.ts
async function monthlyCleanup() {
  await deleteOldErrorLogs();
  await deleteOldMetrics();
  await deleteOldUsageData();
  await deleteOldABTestData();
  await deleteOldAccessLogs();
}
```

### Quarterly Deletion Jobs

**Schedule**: Runs quarterly on the 1st of Jan, Apr, Jul, Oct at 05:00 UTC

**Deletes**:
- Inactive user accounts (2+ years)
- Soft-deleted accounts (30+ days)
- Support tickets older than 3 years
- Email correspondence older than 3 years

**Implementation**:
```typescript
// server/jobs/quarterly-cleanup.ts
async function quarterlyCleanup() {
  await deleteInactiveAccounts();
  await permanentlyDeleteSoftDeletedAccounts();
  await deleteOldSupportTickets();
  await deleteOldEmailCorrespondence();
}
```

## User-Initiated Deletion

### Account Deletion

**Process**:
1. User navigates to Settings > Privacy > Delete Account
2. User confirms deletion (requires password)
3. Account marked as "soft deleted"
4. User receives confirmation email
5. 30-day grace period begins
6. After 30 days, permanent deletion occurs

**What Gets Deleted**:
- User profile and account information
- Learning progress and history
- Exercise responses and scores
- Voice recordings
- AI tutor conversations
- Preferences and settings
- Session data

**What Gets Retained** (for legal compliance):
- Transaction records (7 years)
- Security incident logs (7 years)
- Aggregated, anonymized analytics

**Implementation**:
```typescript
// server/services/UserService.ts
async function deleteUserAccount(userId: string) {
  // Soft delete
  await db.update(users)
    .set({ 
      deletedAt: new Date(),
      email: `deleted_${userId}@deleted.local`,
      status: 'deleted'
    })
    .where(eq(users.id, userId));
  
  // Schedule permanent deletion in 30 days
  await scheduleJob('permanent-delete', userId, 30 * 24 * 60 * 60 * 1000);
}
```

### Data Export Before Deletion

Users can export their data before deletion:
- Go to Settings > Privacy > Download My Data
- Receive JSON file with all personal data
- Includes learning history, progress, preferences
- Complies with GDPR data portability requirements

## Legal Hold Procedures

### When Legal Hold Applies

Data deletion is suspended when:
- Active legal proceedings involving the user
- Regulatory investigation in progress
- Law enforcement request received
- Suspected fraud or abuse under investigation

### Legal Hold Process

1. **Initiation**:
   - Legal team identifies accounts subject to hold
   - Hold flag added to user account
   - Automated deletion suspended

2. **Documentation**:
   - Reason for hold documented
   - Expected duration estimated
   - Responsible party identified

3. **Monitoring**:
   - Monthly review of active holds
   - Update hold status as needed
   - Notify stakeholders of changes

4. **Release**:
   - Legal team approves hold release
   - Hold flag removed from account
   - Normal retention policies resume

**Implementation**:
```typescript
// server/models/User.ts
interface User {
  id: string;
  legalHold: boolean;
  legalHoldReason?: string;
  legalHoldUntil?: Date;
  legalHoldBy?: string;
}

// Deletion jobs check for legal hold
async function canDelete(userId: string): Promise<boolean> {
  const user = await getUser(userId);
  return !user.legalHold;
}
```

## Audit Logging

All data deletion operations are logged for audit purposes:

**Logged Information**:
- Timestamp of deletion
- Type of data deleted
- Reason for deletion (retention policy, user request, etc.)
- User ID (if applicable)
- Number of records deleted
- Deletion job ID

**Audit Log Retention**: 7 years

**Implementation**:
```typescript
// server/utils/auditLog.ts
async function logDeletion(params: {
  dataType: string;
  reason: string;
  userId?: string;
  recordCount: number;
  jobId?: string;
}) {
  await db.insert(auditLogs).values({
    action: 'DELETE',
    timestamp: new Date(),
    ...params
  });
}
```

## Exceptions and Special Cases

### Aggregated Data

Aggregated, anonymized data may be retained indefinitely for:
- Platform analytics
- Research purposes
- Service improvement

**Requirements**:
- Data must be truly anonymized (not pseudonymized)
- Cannot be re-identified
- Complies with GDPR recital 26

### Backup Data

Data in backups follows backup retention policy:
- Not actively deleted from backups
- Backups automatically expire per schedule
- Restoration requests reviewed for compliance

### Third-Party Data

Data shared with third parties (AI services) follows their retention policies:
- Google Gemini: Not used for training, deleted after processing
- OpenAI: May be retained for 30 days, can opt out
- Sentry: 90-day retention

## Compliance and Regulatory Requirements

### GDPR (EU/EEA)

- Data minimization principle
- Storage limitation principle
- Right to erasure (right to be forgotten)
- Data retention must be justified

### CCPA (California)

- Right to deletion
- Exceptions for legal compliance
- Business purpose retention allowed

### Other Jurisdictions

- Compliance with local data protection laws
- Adaptation of retention periods as required
- Regular review of regulatory changes

## Policy Review and Updates

This policy is reviewed:
- Annually (minimum)
- When regulations change
- When business practices change
- After security incidents

**Last Review**: January 2024
**Next Review**: January 2025

## Contact Information

For questions about data retention:

**Email**: privacy@linguamaster.ai

**Data Protection Officer**: dpo@linguamaster.ai

**Response Time**: 30 days

## Related Documentation

- [Privacy Policy](../legal/privacy-policy.md)
- [Terms of Service](../legal/terms-of-service.md)
- [Security Practices](../security/overview.md)

---

**Approved By**: Legal Team, Data Protection Officer
**Effective Date**: January 1, 2024
**Version**: 1.0
