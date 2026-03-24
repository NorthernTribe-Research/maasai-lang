/**
 * GDPR Compliance Routes
 * 
 * Implements GDPR-required features:
 * - Right to access (data export)
 * - Right to erasure (data deletion / right to be forgotten)
 * - Data portability
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * Export user data (GDPR Right to Access)
 * GET /api/gdpr/export
 * 
 * Returns all personal data associated with the authenticated user
 * in a machine-readable JSON format.
 */
router.get('/gdpr/export', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    logger.info('GDPR data export requested', { userId });

    // Collect all user data from various tables
    const userData: any = {
      exportDate: new Date().toISOString(),
      userId,
      format: 'JSON',
      version: '1.0',
    };

    // User profile
    const userProfile = await db.execute(sql`
      SELECT id, username, email, created_at, updated_at, avatar, bio
      FROM users
      WHERE id = ${userId}
    `);
    userData.profile = userProfile.rows[0] || null;

    // User languages
    const userLanguages = await db.execute(sql`
      SELECT ul.*, l.name as language_name, l.code as language_code
      FROM user_languages ul
      JOIN languages l ON ul.language_id = l.id
      WHERE ul.user_id = ${userId}
    `);
    userData.languages = userLanguages.rows;

    // User lessons progress
    const userLessons = await db.execute(sql`
      SELECT ul.*, l.title as lesson_title, l.type as lesson_type
      FROM user_lessons ul
      JOIN lessons l ON ul.lesson_id = l.id
      WHERE ul.user_id = ${userId}
    `);
    userData.lessons = userLessons.rows;

    // User achievements
    const userAchievements = await db.execute(sql`
      SELECT ua.*, a.name as achievement_name, a.description
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = ${userId}
    `);
    userData.achievements = userAchievements.rows;

    // User stats
    const userStats = await db.execute(sql`
      SELECT *
      FROM user_stats
      WHERE user_id = ${userId}
    `);
    userData.stats = userStats.rows[0] || null;

    // User settings
    const userSettings = await db.execute(sql`
      SELECT *
      FROM user_settings
      WHERE user_id = ${userId}
    `);
    userData.settings = userSettings.rows[0] || null;

    // Learning profiles
    const learningProfiles = await db.execute(sql`
      SELECT *
      FROM learning_profiles
      WHERE user_id = ${userId}
    `);
    userData.learningProfiles = learningProfiles.rows;

    // Session context (last 30 days only for privacy)
    const sessionContext = await db.execute(sql`
      SELECT id, session_id, created_at, updated_at, context_summary
      FROM session_context
      WHERE user_id = ${userId}
        AND created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
    `);
    userData.recentSessions = sessionContext.rows;

    // User progress records
    const progressRecords = await db.execute(sql`
      SELECT *
      FROM user_progress
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `);
    userData.progress = progressRecords.rows;

    // Log the export for audit purposes
    await db.execute(sql`
      INSERT INTO audit_log (user_id, action, details, created_at)
      VALUES (
        ${userId},
        'GDPR_DATA_EXPORT',
        ${'User requested data export'}::jsonb,
        NOW()
      )
    `);

    logger.info('GDPR data export completed', {
      userId,
      dataSize: JSON.stringify(userData).length,
    });

    // Set headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="linguamaster-data-export-${userId}-${Date.now()}.json"`
    );

    res.json(userData);
  } catch (error) {
    logger.error('GDPR data export failed', error as Error, { userId });
    res.status(500).json({
      message: 'Failed to export user data',
      code: 'EXPORT_FAILED',
    });
  }
});

/**
 * Request account deletion (GDPR Right to Erasure)
 * POST /api/gdpr/delete-request
 * 
 * Initiates the account deletion process. User receives confirmation email
 * and has 30 days to cancel before permanent deletion.
 */
router.post('/gdpr/delete-request', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { reason } = req.body;

  try {
    logger.info('GDPR deletion request received', { userId, reason });

    // Check if there's already a pending deletion request
    const existingRequest = await db.execute(sql`
      SELECT id, status, requested_at
      FROM deletion_requests
      WHERE user_id = ${userId}
        AND status = 'pending'
    `);

    if (existingRequest.rows.length > 0) {
      return res.status(400).json({
        message: 'A deletion request is already pending for this account',
        code: 'DELETION_PENDING',
        details: {
          requestedAt: existingRequest.rows[0].requested_at,
          scheduledDeletion: new Date(
            new Date(existingRequest.rows[0].requested_at).getTime() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        },
      });
    }

    // Create deletion request
    const scheduledDeletion = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    await db.execute(sql`
      INSERT INTO deletion_requests (
        user_id,
        reason,
        status,
        requested_at,
        scheduled_deletion_at
      ) VALUES (
        ${userId},
        ${reason || 'User requested account deletion'},
        'pending',
        NOW(),
        ${scheduledDeletion.toISOString()}
      )
    `);

    // Log the request for audit purposes
    await db.execute(sql`
      INSERT INTO audit_log (user_id, action, details, created_at)
      VALUES (
        ${userId},
        'GDPR_DELETION_REQUESTED',
        ${JSON.stringify({ reason, scheduledDeletion })}::jsonb,
        NOW()
      )
    `);

    logger.info('GDPR deletion request created', {
      userId,
      scheduledDeletion,
    });

    res.json({
      message: 'Account deletion request submitted successfully',
      scheduledDeletion: scheduledDeletion.toISOString(),
      cancellationDeadline: scheduledDeletion.toISOString(),
      note: 'You have 30 days to cancel this request. After that, your account and all associated data will be permanently deleted.',
    });
  } catch (error) {
    logger.error('GDPR deletion request failed', error as Error, { userId });
    res.status(500).json({
      message: 'Failed to process deletion request',
      code: 'DELETION_REQUEST_FAILED',
    });
  }
});

/**
 * Cancel account deletion request
 * POST /api/gdpr/delete-cancel
 * 
 * Cancels a pending account deletion request.
 */
router.post('/gdpr/delete-cancel', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    logger.info('GDPR deletion cancellation requested', { userId });

    // Find pending deletion request
    const result = await db.execute(sql`
      UPDATE deletion_requests
      SET status = 'cancelled',
          cancelled_at = NOW()
      WHERE user_id = ${userId}
        AND status = 'pending'
      RETURNING id
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'No pending deletion request found',
        code: 'NO_DELETION_REQUEST',
      });
    }

    // Log the cancellation
    await db.execute(sql`
      INSERT INTO audit_log (user_id, action, details, created_at)
      VALUES (
        ${userId},
        'GDPR_DELETION_CANCELLED',
        '{}'::jsonb,
        NOW()
      )
    `);

    logger.info('GDPR deletion request cancelled', { userId });

    res.json({
      message: 'Account deletion request cancelled successfully',
    });
  } catch (error) {
    logger.error('GDPR deletion cancellation failed', error as Error, { userId });
    res.status(500).json({
      message: 'Failed to cancel deletion request',
      code: 'CANCELLATION_FAILED',
    });
  }
});

/**
 * Get deletion request status
 * GET /api/gdpr/delete-status
 * 
 * Returns the status of any pending deletion request.
 */
router.get('/gdpr/delete-status', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const result = await db.execute(sql`
      SELECT id, status, reason, requested_at, scheduled_deletion_at, cancelled_at
      FROM deletion_requests
      WHERE user_id = ${userId}
      ORDER BY requested_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.json({
        hasPendingRequest: false,
        status: null,
      });
    }

    const request = result.rows[0];

    res.json({
      hasPendingRequest: request.status === 'pending',
      status: request.status,
      requestedAt: request.requested_at,
      scheduledDeletion: request.scheduled_deletion_at,
      cancelledAt: request.cancelled_at,
      daysRemaining: request.status === 'pending'
        ? Math.ceil(
            (new Date(request.scheduled_deletion_at).getTime() - Date.now()) /
              (24 * 60 * 60 * 1000)
          )
        : null,
    });
  } catch (error) {
    logger.error('Failed to get deletion status', error as Error, { userId });
    res.status(500).json({
      message: 'Failed to get deletion status',
      code: 'STATUS_CHECK_FAILED',
    });
  }
});

/**
 * Execute pending deletions (Internal cron job endpoint)
 * POST /api/gdpr/execute-deletions
 * 
 * This endpoint should be called by a cron job to process pending deletions.
 * Requires admin authentication.
 */
router.post('/gdpr/execute-deletions', async (req: Request, res: Response) => {
  // TODO: Add admin authentication check
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({
      message: 'Unauthorized',
      code: 'UNAUTHORIZED',
    });
  }

  try {
    logger.info('Executing pending GDPR deletions');

    // Find all pending deletions that are due
    const pendingDeletions = await db.execute(sql`
      SELECT user_id, id as request_id
      FROM deletion_requests
      WHERE status = 'pending'
        AND scheduled_deletion_at <= NOW()
    `);

    const deletedUsers: number[] = [];

    for (const deletion of pendingDeletions.rows) {
      const userId = deletion.user_id;

      try {
        // Delete user data in transaction
        await db.transaction(async (tx) => {
          // Delete from all related tables
          await tx.execute(sql`DELETE FROM user_achievements WHERE user_id = ${userId}`);
          await tx.execute(sql`DELETE FROM user_lessons WHERE user_id = ${userId}`);
          await tx.execute(sql`DELETE FROM user_languages WHERE user_id = ${userId}`);
          await tx.execute(sql`DELETE FROM user_stats WHERE user_id = ${userId}`);
          await tx.execute(sql`DELETE FROM user_settings WHERE user_id = ${userId}`);
          await tx.execute(sql`DELETE FROM learning_profiles WHERE user_id = ${userId}`);
          await tx.execute(sql`DELETE FROM session_context WHERE user_id = ${userId}`);
          await tx.execute(sql`DELETE FROM user_progress WHERE user_id = ${userId}`);
          
          // Mark deletion request as completed
          await tx.execute(sql`
            UPDATE deletion_requests
            SET status = 'completed',
                completed_at = NOW()
            WHERE id = ${deletion.request_id}
          `);

          // Finally, delete the user account
          await tx.execute(sql`DELETE FROM users WHERE id = ${userId}`);

          // Log the deletion (in audit log that's retained for compliance)
          await tx.execute(sql`
            INSERT INTO audit_log (user_id, action, details, created_at)
            VALUES (
              ${userId},
              'GDPR_ACCOUNT_DELETED',
              '{}'::jsonb,
              NOW()
            )
          `);
        });

        deletedUsers.push(userId);
        logger.info('User account deleted (GDPR)', { userId });
      } catch (error) {
        logger.error('Failed to delete user account', error as Error, { userId });
      }
    }

    res.json({
      message: 'Deletion execution completed',
      deletedCount: deletedUsers.length,
      deletedUsers,
    });
  } catch (error) {
    logger.error('Failed to execute deletions', error as Error);
    res.status(500).json({
      message: 'Failed to execute deletions',
      code: 'EXECUTION_FAILED',
    });
  }
});

export default router;
