# Canary Deployment Strategy

## Overview

Canary deployment is a progressive rollout strategy that gradually shifts traffic from the old version to the new version while monitoring for errors. This minimizes risk by exposing only a small percentage of users to the new version initially.

## Strategy

### Traffic Split Progression

| Phase | Duration | New Version Traffic | Old Version Traffic | Action |
|-------|----------|---------------------|---------------------|--------|
| 1 | 5 min | 10% | 90% | Initial canary |
| 2 | 5 min | 25% | 75% | Monitor metrics |
| 3 | 5 min | 50% | 50% | Monitor metrics |
| 4 | 5 min | 75% | 25% | Monitor metrics |
| 5 | 5 min | 100% | 0% | Full rollout |

**Total Duration**: 25-30 minutes for full rollout

### Automatic Rollback Triggers

The deployment automatically rolls back if:
- Error rate exceeds 5% (compared to baseline)
- Response time p95 increases by more than 50%
- Health check failures exceed 2 consecutive checks
- Critical errors detected in logs

## Implementation

### Cloud Run Traffic Splitting

Cloud Run supports traffic splitting between revisions natively.

#### Manual Canary Deployment

```bash
# Deploy new revision without traffic
gcloud run deploy linguamaster \
  --image=us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:NEW_VERSION \
  --region=us-central1 \
  --no-traffic \
  --tag=canary

# Get revision names
OLD_REVISION=$(gcloud run services describe linguamaster \
  --region=us-central1 \
  --format='value(status.traffic[0].revisionName)')

NEW_REVISION=$(gcloud run services describe linguamaster \
  --region=us-central1 \
  --format='value(status.traffic.revisionName)' \
  --filter='status.traffic.tag=canary')

# Phase 1: 10% canary
gcloud run services update-traffic linguamaster \
  --region=us-central1 \
  --to-revisions=$NEW_REVISION=10,$OLD_REVISION=90

# Wait and monitor (5 minutes)
sleep 300

# Phase 2: 25% canary
gcloud run services update-traffic linguamaster \
  --region=us-central1 \
  --to-revisions=$NEW_REVISION=25,$OLD_REVISION=75

# Continue progression...

# Phase 5: 100% to new version
gcloud run services update-traffic linguamaster \
  --region=us-central1 \
  --to-latest
```

### Automated Canary Script

```bash
#!/bin/bash
# scripts/canary-deploy.sh

set -e

SERVICE_NAME="linguamaster"
REGION="us-central1"
NEW_IMAGE="$1"
ERROR_THRESHOLD=0.05  # 5%

if [[ -z "$NEW_IMAGE" ]]; then
  echo "Usage: $0 <image-uri>"
  exit 1
fi

echo "Starting canary deployment..."

# Deploy new revision without traffic
echo "Deploying new revision..."
gcloud run deploy "$SERVICE_NAME" \
  --image="$NEW_IMAGE" \
  --region="$REGION" \
  --no-traffic \
  --tag=canary \
  --quiet

# Get revision names
OLD_REVISION=$(gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" \
  --format='value(status.traffic[0].revisionName)')

NEW_REVISION=$(gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" \
  --format='value(status.traffic.revisionName)' \
  --filter='status.traffic.tag=canary')

echo "Old revision: $OLD_REVISION"
echo "New revision: $NEW_REVISION"

# Function to check error rate
check_error_rate() {
  local revision=$1
  local threshold=$2
  
  # Query Cloud Monitoring for error rate
  # This is a simplified example - implement actual monitoring query
  local error_rate=$(gcloud monitoring time-series list \
    --filter="metric.type=\"run.googleapis.com/request_count\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND resource.labels.revision_name=\"$revision\"" \
    --format="value(points[0].value.int64Value)" \
    --project=northerntriberesearch 2>/dev/null || echo "0")
  
  # Compare with threshold
  if (( $(echo "$error_rate > $threshold" | bc -l) )); then
    return 1
  fi
  return 0
}

# Function to rollback
rollback() {
  echo "ERROR: Canary deployment failed. Rolling back..."
  gcloud run services update-traffic "$SERVICE_NAME" \
    --region="$REGION" \
    --to-revisions="$OLD_REVISION=100" \
    --quiet
  echo "Rollback completed"
  exit 1
}

# Canary progression
PHASES=(10 25 50 75 100)

for phase in "${PHASES[@]}"; do
  old_traffic=$((100 - phase))
  
  echo "Phase: Routing ${phase}% to new revision, ${old_traffic}% to old revision"
  
  if [[ $phase -eq 100 ]]; then
    # Final phase - route all traffic to new revision
    gcloud run services update-traffic "$SERVICE_NAME" \
      --region="$REGION" \
      --to-latest \
      --quiet
  else
    gcloud run services update-traffic "$SERVICE_NAME" \
      --region="$REGION" \
      --to-revisions="$NEW_REVISION=$phase,$OLD_REVISION=$old_traffic" \
      --quiet
  fi
  
  echo "Waiting 5 minutes for metrics..."
  sleep 300
  
  # Check error rate
  if ! check_error_rate "$NEW_REVISION" "$ERROR_THRESHOLD"; then
    echo "ERROR: Error rate exceeded threshold"
    rollback
  fi
  
  echo "Phase $phase% completed successfully"
done

echo "Canary deployment completed successfully!"
echo "New revision $NEW_REVISION is now serving 100% of traffic"
```

## Monitoring During Canary

### Key Metrics to Monitor

1. **Error Rate**
   - Target: < 1%
   - Rollback trigger: > 5%
   - Query: Cloud Run request count with status 5xx

2. **Response Time**
   - Target: p95 < 2 seconds
   - Rollback trigger: p95 > 3 seconds or 50% increase
   - Query: Cloud Run request latencies

3. **Request Count**
   - Monitor for unexpected drops (may indicate errors)
   - Compare new vs old revision

4. **Health Checks**
   - Target: 100% success rate
   - Rollback trigger: 2 consecutive failures

### Cloud Monitoring Queries

#### Error Rate by Revision

```
fetch cloud_run_revision
| metric 'run.googleapis.com/request_count'
| filter resource.service_name == 'linguamaster'
| group_by [resource.revision_name, metric.response_code_class]
| every 1m
| group_by [resource.revision_name],
    [value_request_count_aggregate: aggregate(value.request_count)]
```

#### Response Time p95 by Revision

```
fetch cloud_run_revision
| metric 'run.googleapis.com/request_latencies'
| filter resource.service_name == 'linguamaster'
| group_by [resource.revision_name]
| every 1m
| group_by [resource.revision_name],
    [value_request_latencies_percentile: percentile(value.request_latencies, 95)]
```

### Dashboard Setup

Create a Cloud Monitoring dashboard with:

1. **Traffic Split Chart**
   - Shows percentage of traffic to each revision
   - Stacked area chart

2. **Error Rate Comparison**
   - Line chart comparing error rates
   - Old revision vs new revision

3. **Response Time Comparison**
   - Line chart comparing p50, p95, p99
   - Old revision vs new revision

4. **Request Volume**
   - Bar chart showing requests per revision
   - Helps identify traffic distribution

## GitLab CI/CD Integration

### Automated Canary in Pipeline

Add to `.gitlab-ci.yml`:

```yaml
deploy:production:canary:
  stage: deploy-production
  script:
    - ./scripts/canary-deploy.sh "$IMAGE_URI"
  environment:
    name: production
    url: https://linguamaster.ai
  when: manual
  only:
    - main
```

### With Monitoring Integration

```yaml
deploy:production:canary:
  stage: deploy-production
  script:
    # Deploy canary
    - ./scripts/canary-deploy.sh "$IMAGE_URI"
    
    # Monitor for 30 minutes
    - |
      for i in {1..6}; do
        echo "Monitoring phase $i/6..."
        
        # Check error rate
        ERROR_RATE=$(./scripts/check-error-rate.sh)
        if (( $(echo "$ERROR_RATE > 0.05" | bc -l) )); then
          echo "Error rate too high: $ERROR_RATE"
          ./scripts/rollback.sh -e production -r "High error rate during canary"
          exit 1
        fi
        
        sleep 300
      done
    
    echo "Canary deployment successful!"
  environment:
    name: production
    url: https://linguamaster.ai
  when: manual
  only:
    - main
```

## Best Practices

### 1. Start Small
- Begin with 5-10% traffic to canary
- Increase gradually (10% → 25% → 50% → 75% → 100%)
- Allow sufficient time between phases (5-10 minutes)

### 2. Monitor Continuously
- Watch error rates in real-time
- Compare metrics between old and new revisions
- Set up alerts for anomalies

### 3. Have Rollback Ready
- Keep old revision running until canary is validated
- Automate rollback triggers
- Test rollback procedure regularly

### 4. Communicate
- Notify team before starting canary
- Share monitoring dashboard link
- Document any issues observed

### 5. Validate Thoroughly
- Run smoke tests on canary revision before routing traffic
- Check health endpoints
- Verify database connectivity
- Test critical user flows

## Rollback Procedure

### Automatic Rollback

If monitoring detects issues:

```bash
# Immediate rollback to old revision
gcloud run services update-traffic linguamaster \
  --region=us-central1 \
  --to-revisions=$OLD_REVISION=100 \
  --quiet

# Or use rollback script
./scripts/rollback.sh -e production -r "Canary deployment failed"
```

### Manual Rollback

If you observe issues manually:

```bash
# Get current revisions
gcloud run revisions list \
  --service=linguamaster \
  --region=us-central1 \
  --limit=5

# Rollback to specific revision
gcloud run services update-traffic linguamaster \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION=100 \
  --quiet
```

## Testing Canary Deployment

### Staging Environment Test

Before using canary in production, test in staging:

```bash
# Deploy to staging with canary
./scripts/canary-deploy.sh \
  us-central1-docker.pkg.dev/northerntriberesearch/linguamaster/linguamaster:test \
  linguamaster-staging \
  us-central1

# Monitor staging canary
# Verify traffic split works correctly
# Test rollback procedure
```

### Smoke Tests

Run smoke tests against canary revision:

```bash
# Get canary URL
CANARY_URL=$(gcloud run services describe linguamaster \
  --region=us-central1 \
  --format='value(status.traffic.url)' \
  --filter='status.traffic.tag=canary')

# Run smoke tests
curl -f "$CANARY_URL/api/health" || exit 1
curl -f "$CANARY_URL/" || exit 1

echo "Smoke tests passed"
```

## Troubleshooting

### Issue: Traffic not splitting correctly

**Symptoms**: All traffic going to one revision

**Solution**:
```bash
# Check current traffic split
gcloud run services describe linguamaster \
  --region=us-central1 \
  --format='value(status.traffic)'

# Manually set traffic split
gcloud run services update-traffic linguamaster \
  --region=us-central1 \
  --to-revisions=NEW_REVISION=10,OLD_REVISION=90
```

### Issue: Cannot access canary revision

**Symptoms**: Canary URL returns 404

**Solution**:
```bash
# Verify canary tag exists
gcloud run services describe linguamaster \
  --region=us-central1 \
  --format='value(status.traffic.tag)'

# Re-tag revision
gcloud run services update-traffic linguamaster \
  --region=us-central1 \
  --update-tags=canary=NEW_REVISION
```

### Issue: Metrics not available

**Symptoms**: Cannot query metrics for new revision

**Solution**:
- Wait 2-3 minutes for metrics to populate
- Verify Cloud Monitoring API is enabled
- Check service account permissions

## References

- [Cloud Run Traffic Management](https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration)
- [Canary Deployments Best Practices](https://cloud.google.com/architecture/application-deployment-and-testing-strategies)
- [Cloud Monitoring for Cloud Run](https://cloud.google.com/run/docs/monitoring)

---

**Last Updated**: January 2024
**Maintained By**: DevOps Team
**Review Schedule**: Quarterly
