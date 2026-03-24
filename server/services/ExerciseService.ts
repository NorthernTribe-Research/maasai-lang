import { BaseService } from './BaseService';
import { openAIService } from './OpenAIService';
import { aiServiceMonitor } from './AIServiceMonitor';
import { db } from '../db';
import { 
  exercises, 
  exerciseSubmissions,
  learningProfiles,
  xpGains,
  Exercise,
  ExerciseSubmission
} from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { withTransactionAndRetry } from '../utils/transactions';

/**
 * Exercise Service for generating and evaluating practice exercises
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.2
 */
export class ExerciseService extends BaseService {
  constructor() {
    super();
    this.log("ExerciseService initialized", "info");
  }

  /**
   * Generate exercises targeting weakness areas
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  async generateExercises(params: {
    profileId: string;
    targetLanguage: string;
    weaknessAreas?: string[];
    count?: number;
  }): Promise<Exercise[]> {
    try {
      this.log(`Generating exercises for profile ${params.profileId}`, "info");

      // Get learning profile to determine difficulty
      const profile = await db.query.learningProfiles.findFirst({
        where: eq(learningProfiles.id, params.profileId)
      });

      if (!profile) {
        throw new Error("Learning profile not found");
      }

      // Determine difficulty based on proficiency level
      const difficultyMap: { [key: string]: number } = {
        'Beginner': 3,
        'Elementary': 4,
        'Intermediate': 5,
        'Upper Intermediate': 6,
        'Advanced': 7,
        'Proficient': 8
      };

      const difficulty = difficultyMap[profile.proficiencyLevel] || 5;

      // Get weakness areas from profile if not provided
      const weaknesses = params.weaknessAreas || 
        (Array.isArray(profile.weaknesses) ? profile.weaknesses : []);

      // Generate at least 5 exercises per session
      const count = params.count || 5;
      const generatedExercises: Exercise[] = [];

      for (let i = 0; i < count; i++) {
        // Target a specific weakness if available
        const targetWeakness = weaknesses.length > 0 
          ? weaknesses[i % weaknesses.length] 
          : undefined;

        // Generate exercise using OpenAI with monitoring
        const exerciseData = await aiServiceMonitor.executeWithMonitoring(
          'openai',
          () => openAIService.generateExercises({
            weaknesses: weaknesses.map(w => ({ topic: w, category: 'general' })),
            proficiencyLevel: profile.proficiencyLevel,
            targetLanguage: params.targetLanguage,
            count: 1
          })
        );

        // Parse and store exercise
        if (exerciseData && Array.isArray(exerciseData) && exerciseData.length > 0) {
          const ex = exerciseData[0];
          
          const [exercise] = await db.insert(exercises).values({
            type: ex.type || 'multiple-choice',
            question: ex.question,
            options: ex.options || null,
            correctAnswer: ex.correctAnswer,
            explanation: ex.explanation || '',
            difficulty,
            targetWeakness: targetWeakness || null,
            targetLanguage: params.targetLanguage,
            createdAt: new Date()
          }).returning();

          generatedExercises.push(exercise);
        }
      }

      this.log(`Generated ${generatedExercises.length} exercises`, "info");
      return generatedExercises;
    } catch (error) {
      throw this.handleError(error, "ExerciseService.generateExercises");
    }
  }

  /**
   * Submit and evaluate an exercise answer
   * Requirements: 6.5, 10.2, 19.4, 19.6
   * Uses transaction to ensure submission, XP gain, and profile update are atomic
   */
  async submitExercise(params: {
    exerciseId: string;
    profileId: string;
    userAnswer: string;
    timeTaken: number;
  }): Promise<{
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
    feedback: string;
    xpAwarded: number;
  }> {
    try {
      this.log(`Submitting exercise ${params.exerciseId} for profile ${params.profileId}`, "info");

      // Get the exercise
      const exercise = await db.query.exercises.findFirst({
        where: eq(exercises.id, params.exerciseId)
      });

      if (!exercise) {
        throw new Error("Exercise not found");
      }

      // Get profile to get userId
      const profile = await db.query.learningProfiles.findFirst({
        where: eq(learningProfiles.id, params.profileId)
      });

      if (!profile) {
        throw new Error("Profile not found");
      }

      // Evaluate answer
      const isCorrect = this.evaluateAnswer(
        params.userAnswer,
        exercise.correctAnswer
      );

      // Calculate XP based on correctness and difficulty
      let xpAwarded = 0;
      if (isCorrect) {
        const baseXP = 20;
        const difficultyBonus = exercise.difficulty * 5;
        const speedBonus = params.timeTaken < 30 ? 10 : 0;
        xpAwarded = baseXP + difficultyBonus + speedBonus;
      }

      // Generate feedback
      const feedback = isCorrect
        ? this.generatePositiveFeedback(exercise.difficulty)
        : this.generateCorrectiveFeedback(exercise.explanation);

      // Use transaction with retry to ensure atomic operation
      if (isCorrect && xpAwarded > 0) {
        await withTransactionAndRetry(async (tx) => {
          // Record submission
          await tx.insert(exerciseSubmissions).values({
            exerciseId: params.exerciseId,
            profileId: params.profileId,
            userAnswer: params.userAnswer,
            isCorrect,
            submittedAt: new Date(),
            timeTaken: params.timeTaken
          });

          // Record XP gain
          await tx.insert(xpGains).values({
            userId: profile.userId,
            profileId: params.profileId,
            amount: xpAwarded,
            source: 'exercise',
            sourceId: params.exerciseId,
            timestamp: new Date()
          });

          // Update profile XP
          await tx.update(learningProfiles)
            .set({
              currentXP: profile.currentXP + xpAwarded,
              lastActivityDate: new Date(),
              updatedAt: new Date()
            })
            .where(eq(learningProfiles.id, params.profileId));
        });
      } else {
        // Just record submission if incorrect (no XP)
        await db.insert(exerciseSubmissions).values({
          exerciseId: params.exerciseId,
          profileId: params.profileId,
          userAnswer: params.userAnswer,
          isCorrect,
          submittedAt: new Date(),
          timeTaken: params.timeTaken
        });
      }

      this.log(`Exercise submitted, correct: ${isCorrect}, XP: ${xpAwarded}`, "info");

      return {
        isCorrect,
        correctAnswer: exercise.correctAnswer,
        explanation: exercise.explanation,
        feedback,
        xpAwarded
      };
    } catch (error) {
      throw this.handleError(error, "ExerciseService.submitExercise");
    }
  }

  /**
   * Get exercise history for a profile
   */
  async getExerciseHistory(
    profileId: string,
    limit: number = 20
  ): Promise<ExerciseSubmission[]> {
    try {
      const submissions = await db.query.exerciseSubmissions.findMany({
        where: eq(exerciseSubmissions.profileId, profileId),
        limit,
        orderBy: (exerciseSubmissions, { desc }) => [desc(exerciseSubmissions.submittedAt)]
      });

      return submissions;
    } catch (error) {
      throw this.handleError(error, "ExerciseService.getExerciseHistory");
    }
  }

  /**
   * Get exercise statistics for a profile
   * Requirements: 15.2
   */
  async getExerciseStats(profileId: string): Promise<{
    totalAttempts: number;
    correctAnswers: number;
    accuracy: number;
    averageTime: number;
    weaknessProgress: { [key: string]: number };
  }> {
    try {
      const submissions = await db.query.exerciseSubmissions.findMany({
        where: eq(exerciseSubmissions.profileId, profileId)
      });

      const totalAttempts = submissions.length;
      const correctAnswers = submissions.filter(s => s.isCorrect).length;
      const accuracy = totalAttempts > 0 
        ? Math.round((correctAnswers / totalAttempts) * 100) 
        : 0;

      const totalTime = submissions.reduce((sum, s) => sum + s.timeTaken, 0);
      const averageTime = totalAttempts > 0 
        ? Math.round(totalTime / totalAttempts) 
        : 0;

      // Calculate progress by weakness area
      const weaknessProgress: { [key: string]: number } = {};
      
      for (const submission of submissions) {
        const exercise = await db.query.exercises.findFirst({
          where: eq(exercises.id, submission.exerciseId)
        });

        if (exercise && exercise.targetWeakness) {
          if (!weaknessProgress[exercise.targetWeakness]) {
            weaknessProgress[exercise.targetWeakness] = 0;
          }
          if (submission.isCorrect) {
            weaknessProgress[exercise.targetWeakness]++;
          }
        }
      }

      return {
        totalAttempts,
        correctAnswers,
        accuracy,
        averageTime,
        weaknessProgress
      };
    } catch (error) {
      throw this.handleError(error, "ExerciseService.getExerciseStats");
    }
  }

  /**
   * Evaluate if user answer matches correct answer
   */
  private evaluateAnswer(userAnswer: string, correctAnswer: string): boolean {
    // Normalize answers for comparison
    const normalize = (str: string) => 
      str.toLowerCase().trim().replace(/[.,!?;:]/g, '');

    return normalize(userAnswer) === normalize(correctAnswer);
  }

  /**
   * Generate positive feedback for correct answers
   */
  private generatePositiveFeedback(difficulty: number): string {
    const feedbackOptions = [
      "Excellent work! You're making great progress.",
      "Perfect! Keep up the great work.",
      "Outstanding! You've mastered this concept.",
      "Brilliant! Your understanding is improving.",
      "Well done! You're on the right track."
    ];

    if (difficulty >= 7) {
      return "Impressive! That was a challenging question and you nailed it!";
    }

    return feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
  }

  /**
   * Generate corrective feedback for incorrect answers
   */
  private generateCorrectiveFeedback(explanation: string): string {
    return `Not quite right. ${explanation} Take your time to review and try again!`;
  }
}

export const exerciseService = new ExerciseService();
