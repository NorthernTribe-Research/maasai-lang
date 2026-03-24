import { describe, expect, it } from 'vitest';
import { ExerciseService } from './ExerciseService';

describe('ExerciseService', () => {
  const service = new ExerciseService();

  it('normalizes punctuation and case when evaluating answers', () => {
    const result = (service as any).evaluateAnswer('Hola, Mundo!', 'hola mundo');
    expect(result).toBe(true);
  });

  it('includes explanation text in corrective feedback', () => {
    const explanation = 'The correct verb tense is past perfect.';
    const feedback = (service as any).generateCorrectiveFeedback(explanation);

    expect(feedback).toContain(explanation);
    expect(feedback).toContain('Not quite right.');
  });
});
