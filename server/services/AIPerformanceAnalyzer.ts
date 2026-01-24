import { BaseService } from "./BaseService";
import { GeminiService } from "./GeminiService";

/**
 * AI Performance Analyzer - Continuously evaluates and tracks user performance
 * Provides real-time insights and adaptive recommendations
 */
export class AIPerformanceAnalyzer extends BaseService {
  private geminiService: GeminiService;
  private performanceHistory: Map<string, any[]> = new Map();

  constructor() {
    super();
    this.geminiService = new GeminiService();
    this.log("AI Performance Analyzer initialized", "info");
  }

  /**
   * Analyze a single user response
   */
  async analyzeResponse(
    userResponse: string,
    expectedAnswer: string,
    context: {
      concept: string;
      difficulty: string;
      languageName: string;
    }
  ): Promise<{
    isCorrect: boolean;
    accuracy: number;
    errorType: string | null;
    specificErrors: string[];
    strengths: string[];
    suggestions: string[];
    encouragement: string;
  }> {
    try {
      const prompt = `Analyze this language learning response in detail.

Language: ${context.languageName}
Concept: ${context.concept}
Difficulty: ${context.difficulty}
Expected: "${expectedAnswer}"
User's Response: "${userResponse}"

Provide detailed analysis:
1. Is the response correct? (consider variations and natural language)
2. Accuracy score (0-100)
3. Error type if incorrect (grammar, vocabulary, syntax, pronunciation, etc.)
4. Specific errors found
5. Strengths demonstrated
6. Suggestions for improvement
7. Encouraging message

Return JSON:
{
  "isCorrect": boolean,
  "accuracy": number,
  "errorType": "string or null",
  "specificErrors": ["error1", "error2"],
  "strengths": ["strength1"],
  "suggestions": ["suggestion1"],
  "encouragement": "positive message"
}`;

      const content = await this.geminiService.generateContent(prompt);
      const jsonStr = content.replace(/\`\`\`json|\`\`\`/g, "").trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      this.handleError(error, "analyzing response");
      return this.getBasicAnalysis(userResponse, expectedAnswer);
    }
  }

  /**
   * Track performance metrics over time
   */
  trackPerformance(
    userId: string,
    metric: {
      concept: string;
      accuracy: number;
      responseTime: number;
      difficulty: string;
      timestamp: Date;
    }
  ): void {
    if (!this.performanceHistory.has(userId)) {
      this.performanceHistory.set(userId, []);
    }

    const history = this.performanceHistory.get(userId)!;
    history.push(metric);

    // Keep only last 100 metrics per user
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(
    userId: string,
    timeRange: 'day' | 'week' | 'month' | 'all' = 'week'
  ): {
    overallTrend: 'improving' | 'stable' | 'declining';
    averageAccuracy: number;
    conceptPerformance: { [concept: string]: number };
    improvementRate: number;
    strongConcepts: string[];
    weakConcepts: string[];
  } {
    const history = this.performanceHistory.get(userId) || [];
    
    if (history.length === 0) {
      return {
        overallTrend: 'stable',
        averageAccuracy: 0,
        conceptPerformance: {},
        improvementRate: 0,
        strongConcepts: [],
        weakConcepts: []
      };
    }

    // Filter by time range
    const now = new Date();
    const cutoff = new Date();
    switch (timeRange) {
      case 'day':
        cutoff.setDate(cutoff.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(cutoff.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(cutoff.getMonth() - 1);
        break;
    }

    const recentMetrics = history.filter(m => 
      timeRange === 'all' || m.timestamp >= cutoff
    );

    // Calculate average accuracy
    const averageAccuracy = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.accuracy, 0) / recentMetrics.length
      : 0;

    // Calculate concept performance
    const conceptPerformance: { [concept: string]: number } = {};
    const conceptCounts: { [concept: string]: number } = {};

    recentMetrics.forEach(m => {
      if (!conceptPerformance[m.concept]) {
        conceptPerformance[m.concept] = 0;
        conceptCounts[m.concept] = 0;
      }
      conceptPerformance[m.concept] += m.accuracy;
      conceptCounts[m.concept]++;
    });

    Object.keys(conceptPerformance).forEach(concept => {
      conceptPerformance[concept] /= conceptCounts[concept];
    });

    // Identify strong and weak concepts
    const sortedConcepts = Object.entries(conceptPerformance)
      .sort(([, a], [, b]) => b - a);

    const strongConcepts = sortedConcepts
      .filter(([, score]) => score >= 80)
      .map(([concept]) => concept);

    const weakConcepts = sortedConcepts
      .filter(([, score]) => score < 60)
      .map(([concept]) => concept);

    // Calculate improvement rate
    const half = Math.floor(recentMetrics.length / 2);
    const firstHalfAvg = half > 0 ? recentMetrics.slice(0, half).reduce((sum, m) => sum + m.accuracy, 0) / half : 0;
    const secondHalfAvg = (recentMetrics.length - half) > 0 ? recentMetrics.slice(half).reduce((sum, m) => sum + m.accuracy, 0) / (recentMetrics.length - half) : 0;
    const improvementRate = secondHalfAvg - firstHalfAvg;

    // Determine overall trend
    let overallTrend: 'improving' | 'stable' | 'declining';
    if (improvementRate > 5) {
      overallTrend = 'improving';
    } else if (improvementRate < -5) {
      overallTrend = 'declining';
    } else {
      overallTrend = 'stable';
    }

    return {
      overallTrend,
      averageAccuracy,
      conceptPerformance,
      improvementRate,
      strongConcepts,
      weakConcepts
    };
  }

  /**
   * Get AI-powered performance insights
   */
  async getAIInsights(
    userId: string,
    userProfile: any
  ): Promise<{
    summary: string;
    achievements: string[];
    concerns: string[];
    recommendations: string[];
    motivationalMessage: string;
  }> {
    try {
      const trends = this.getPerformanceTrends(userId);
      const history = this.performanceHistory.get(userId) || [];

      const prompt = `Analyze this language learner's performance and provide insights.

Performance Trends: ${JSON.stringify(trends)}
Recent Performance: ${JSON.stringify(history.slice(-10))}
User Profile: ${JSON.stringify(userProfile)}

Provide:
1. Brief performance summary
2. Key achievements to celebrate
3. Areas of concern if any
4. Specific, actionable recommendations
5. Motivational message

Return JSON with all components.`;

      const content = await this.geminiService.generateContent(prompt);
      const jsonStr = content.replace(/\`\`\`json|\`\`\`/g, "").trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      this.handleError(error, "getting AI insights");
      return this.getBasicInsights(this.getPerformanceTrends(userId));
    }
  }

  /**
   * Recommend difficulty adjustment
   */
  recommendDifficultyAdjustment(
    userId: string,
    currentDifficulty: string
  ): {
    shouldAdjust: boolean;
    newDifficulty: string | null;
    reason: string;
    confidence: number;
  } {
    const trends = this.getPerformanceTrends(userId, 'week');

    if (trends.averageAccuracy >= 90 && currentDifficulty !== 'advanced') {
      return {
        shouldAdjust: true,
        newDifficulty: currentDifficulty === 'beginner' ? 'intermediate' : 'advanced',
        reason: 'Excellent performance indicates readiness for increased challenge',
        confidence: 0.9
      };
    }

    if (trends.averageAccuracy < 50 && currentDifficulty !== 'beginner') {
      return {
        shouldAdjust: true,
        newDifficulty: currentDifficulty === 'advanced' ? 'intermediate' : 'beginner',
        reason: 'Lower accuracy suggests content may be too challenging',
        confidence: 0.8
      };
    }

    return {
      shouldAdjust: false,
      newDifficulty: null,
      reason: 'Current difficulty level is appropriate',
      confidence: 0.7
    };
  }

  // Helper methods

  private getBasicAnalysis(userResponse: string, expectedAnswer: string) {
    const isCorrect = userResponse.toLowerCase().trim() === expectedAnswer.toLowerCase().trim();
    return {
      isCorrect,
      accuracy: isCorrect ? 100 : 50,
      errorType: isCorrect ? null : 'general',
      specificErrors: isCorrect ? [] : ['Response does not match expected answer'],
      strengths: isCorrect ? ['Correct answer provided'] : ['Attempted the question'],
      suggestions: isCorrect ? [] : ['Review the concept and try again'],
      encouragement: isCorrect ? 'Excellent work!' : 'Keep practicing!'
    };
  }

  private getBasicInsights(trends: any) {
    return {
      summary: `Your average accuracy is ${Math.round(trends.averageAccuracy)}%. You're ${trends.overallTrend}!`,
      achievements: trends.strongConcepts.length > 0 ? [`Strong performance in ${trends.strongConcepts[0]}`] : ['Consistent practice'],
      concerns: trends.weakConcepts.length > 0 ? [`Need more practice with ${trends.weakConcepts[0]}`] : [],
      recommendations: ['Practice daily', 'Focus on weak areas', 'Review previous lessons'],
      motivationalMessage: 'You\'re making progress! Keep up the great work!'
    };
  }

  /**
   * Clear performance history (for testing or data cleanup)
   */
  clearHistory(userId?: string): void {
    if (userId) {
      this.performanceHistory.delete(userId);
    } else {
      this.performanceHistory.clear();
    }
    this.log("Performance history cleared", "info");
  }
}

export const aiPerformanceAnalyzer = new AIPerformanceAnalyzer();
