import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  withTransaction, 
  withRetry, 
  withTransactionAndRetry,
  isRetryableError,
  withSmartRetry
} from './transactions';
import { db } from '../db';

// Mock the database
vi.mock('../db', () => ({
  db: {
    transaction: vi.fn()
  },
  connection: {}
}));

describe('Transaction Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withTransaction', () => {
    it('should execute operation within a transaction', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback(db);
      });
      
      (db.transaction as any) = mockTransaction;

      const result = await withTransaction(mockOperation);

      expect(result).toBe('success');
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(mockOperation).toHaveBeenCalledWith(db);
    });

    it('should rollback transaction on error', async () => {
      const error = new Error('Transaction failed');
      const mockOperation = vi.fn().mockRejectedValue(error);
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback(db);
      });
      
      (db.transaction as any) = mockTransaction;

      await expect(withTransaction(mockOperation)).rejects.toThrow('Transaction failed');
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      const result = await withRetry(mockOperation, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValue('success');

      const result = await withRetry(mockOperation, { 
        maxRetries: 3,
        retryDelay: 10,
        exponentialBackoff: false
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries exhausted', async () => {
      const error = new Error('Persistent failure');
      const mockOperation = vi.fn().mockRejectedValue(error);

      await expect(
        withRetry(mockOperation, { 
          maxRetries: 2,
          retryDelay: 10
        })
      ).rejects.toThrow('Persistent failure');

      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff when enabled', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await withRetry(mockOperation, {
        maxRetries: 2,
        retryDelay: 100,
        exponentialBackoff: true
      });
      const duration = Date.now() - startTime;

      // Should wait 100ms + 200ms = 300ms minimum
      expect(duration).toBeGreaterThanOrEqual(250);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('withTransactionAndRetry', () => {
    it('should combine transaction and retry logic', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      const mockTransaction = vi.fn().mockImplementation(async (callback) => {
        return await callback(db);
      });
      
      (db.transaction as any) = mockTransaction;

      const result = await withTransactionAndRetry(mockOperation, {
        maxRetries: 2,
        retryDelay: 10
      });

      expect(result).toBe('success');
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(mockOperation).toHaveBeenCalledWith(db);
    });

    it('should retry transaction on failure', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      const mockTransaction = vi.fn()
        .mockRejectedValueOnce(new Error('Transaction failed'))
        .mockImplementation(async (callback) => {
          return await callback(db);
        });
      
      (db.transaction as any) = mockTransaction;

      const result = await withTransactionAndRetry(mockOperation, {
        maxRetries: 2,
        retryDelay: 10
      });

      expect(result).toBe('success');
      expect(mockTransaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      const retryableErrors = [
        new Error('Connection timeout'),
        new Error('Network error'),
        new Error('Temporary failure')
      ];

      retryableErrors.forEach(error => {
        expect(isRetryableError(error)).toBe(true);
      });
    });

    it('should identify non-retryable errors', () => {
      const nonRetryableErrors = [
        new Error('unique constraint violation'),
        new Error('foreign key constraint failed'),
        new Error('check constraint violation'),
        new Error('not null constraint violation'),
        new Error('duplicate key value')
      ];

      nonRetryableErrors.forEach(error => {
        expect(isRetryableError(error)).toBe(false);
      });
    });
  });

  describe('withSmartRetry', () => {
    it('should retry retryable errors', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValue('success');

      const result = await withSmartRetry(mockOperation, {
        maxRetries: 2,
        retryDelay: 10
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const error = new Error('unique constraint violation');
      const mockOperation = vi.fn().mockRejectedValue(error);

      await expect(
        withSmartRetry(mockOperation, {
          maxRetries: 2,
          retryDelay: 10
        })
      ).rejects.toThrow('unique constraint violation');

      expect(mockOperation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should stop retrying after max attempts even for retryable errors', async () => {
      const error = new Error('Connection timeout');
      const mockOperation = vi.fn().mockRejectedValue(error);

      await expect(
        withSmartRetry(mockOperation, {
          maxRetries: 2,
          retryDelay: 10
        })
      ).rejects.toThrow('Connection timeout');

      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});
