import { BaseService } from './BaseService';
import { geminiService } from './GeminiService';
import { openAIService } from './OpenAIService';

/**
 * AI Service Monitor for health checks, fallback logic, and performance tracking
 * Requirements: 18.4, 18.5, 18.6, 24.2
 */
export class AIServiceMonitor extends BaseService {
  private serviceMetrics: Map<string, {
    requestCount: number;
    successCount: number;
    failureCount: number;
    totalResponseTime: number;
    lastHealthCheck: Date;
    isHealthy: boolean;
  }>;

  constructor() {
    super();
    this.serviceMetrics = new Map();
    this.initializeMetrics();
  }

  /**
   * Initialize metrics for all AI services
   */
  private initializeMetrics(): void {
    const services = ['gemini', 'openai', 'whisper'];
    services.forEach(service => {
      this.serviceMetrics.set(service, {
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        totalResponseTime: 0,
        lastHealthCheck: new Date(),
        isHealthy: true
      });
    });
  }

  /**
   * Record a service request
   */
  recordRequest(service: string, success: boolean, responseTime: number): void {
    const metrics = this.serviceMetrics.get(service);
    if (!metrics) return;

    metrics.requestCount++;
    metrics.totalResponseTime += responseTime;
    
    if (success) {
      metrics.successCount++;
    } else {
      metrics.failureCount++;
    }

    // Update health status based on recent performance
    const successRate = metrics.successCount / metrics.requestCount;
    metrics.isHealthy = successRate > 0.8; // 80% success rate threshold

    this.serviceMetrics.set(service, metrics);
  }

  /**
   * Get service metrics
   */
  getServiceMetrics(service: string): any {
    const metrics = this.serviceMetrics.get(service);
    if (!metrics) return null;

    const avgResponseTime = metrics.requestCount > 0 
      ? metrics.totalResponseTime / metrics.requestCount 
      : 0;

    const successRate = metrics.requestCount > 0
      ? (metrics.successCount / metrics.requestCount) * 100
      : 100;

    return {
      service,
      requestCount: metrics.requestCount,
      successCount: metrics.successCount,
      failureCount: metrics.failureCount,
      successRate: successRate.toFixed(2) + '%',
      averageResponseTime: avgResponseTime.toFixed(2) + 'ms',
      isHealthy: metrics.isHealthy,
      lastHealthCheck: metrics.lastHealthCheck
    };
  }

  /**
   * Get all service metrics
   */
  getAllMetrics(): any[] {
    const allMetrics: any[] = [];
    this.serviceMetrics.forEach((_, service) => {
      allMetrics.push(this.getServiceMetrics(service));
    });
    return allMetrics;
  }

  /**
   * Check if a service is healthy
   */
  isServiceHealthy(service: string): boolean {
    const metrics = this.serviceMetrics.get(service);
    return metrics ? metrics.isHealthy : false;
  }

  /**
   * Perform health check on Gemini service
   */
  async checkGeminiHealth(): Promise<boolean> {
    try {
      const startTime = Date.now();
      await geminiService.generateContent("Test");
      const responseTime = Date.now() - startTime;
      
      this.recordRequest('gemini', true, responseTime);
      this.log("Gemini health check passed", "info");
      return true;
    } catch (error) {
      this.recordRequest('gemini', false, 0);
      this.log("Gemini health check failed", "error");
      return false;
    }
  }

  /**
   * Perform health check on OpenAI service
   */
  async checkOpenAIHealth(): Promise<boolean> {
    try {
      const startTime = Date.now();
      await openAIService.generateCompletion("Test", 'gpt-3.5-turbo', 10);
      const responseTime = Date.now() - startTime;
      
      this.recordRequest('openai', true, responseTime);
      this.log("OpenAI health check passed", "info");
      return true;
    } catch (error) {
      this.recordRequest('openai', false, 0);
      this.log("OpenAI health check failed", "error");
      return false;
    }
  }

  /**
   * Generate curriculum with automatic fallback
   * Requirements: 18.4
   */
  async generateCurriculumWithFallback(params: {
    targetLanguage: string;
    nativeLanguage: string;
    proficiencyLevel: string;
  }): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Try Gemini first (primary service)
      this.log("Attempting curriculum generation with Gemini", "info");
      const result = await geminiService.generateCurriculum(params);
      const responseTime = Date.now() - startTime;
      
      this.recordRequest('gemini', true, responseTime);
      this.log(`Curriculum generated successfully with Gemini in ${responseTime}ms`, "info");
      
      return result;
    } catch (geminiError) {
      const geminiResponseTime = Date.now() - startTime;
      this.recordRequest('gemini', false, geminiResponseTime);
      this.log("Gemini curriculum generation failed, falling back to OpenAI", "warn");
      
      let fallbackStartTime = Date.now();
      try {
        // Fallback to OpenAI
        fallbackStartTime = Date.now();
        const result = await openAIService.generateCurriculumFallback(params);
        const fallbackResponseTime = Date.now() - fallbackStartTime;
        
        this.recordRequest('openai', true, fallbackResponseTime);
        this.log(`Curriculum generated successfully with OpenAI fallback in ${fallbackResponseTime}ms`, "info");
        
        return result;
      } catch (openaiError) {
        const openaiResponseTime = Date.now() - fallbackStartTime;
        this.recordRequest('openai', false, openaiResponseTime);
        
        this.log("Both Gemini and OpenAI curriculum generation failed, using local curriculum template", "warn");
        return this.generateLocalCurriculumTemplate(params);
      }
    }
  }

  /**
   * Last-resort curriculum fallback when external AI providers are unavailable.
   */
  private generateLocalCurriculumTemplate(params: {
    targetLanguage: string;
    nativeLanguage: string;
    proficiencyLevel: string;
  }): any {
    const beginnerTopics = [
      "Greetings and Introductions",
      "Numbers and Time",
      "Daily Routines",
      "Food and Ordering",
      "Directions and Places",
      "Family and Relationships",
      "Shopping Basics",
      "Travel Essentials",
      "Health and Wellbeing",
      "Social Conversations"
    ];

    const intermediateTopics = [
      "Describing Experiences",
      "Work and Professional Contexts",
      "Opinions and Arguments",
      "Media and Current Events",
      "Culture and Traditions",
      "Problem Solving Dialogues",
      "Advanced Travel Scenarios",
      "Education and Learning",
      "Technology Conversations",
      "Community and Society"
    ];

    const advancedTopics = [
      "Nuanced Communication",
      "Formal Presentations",
      "Debate and Persuasion",
      "Academic Discussions",
      "Cross-Cultural Communication",
      "Professional Negotiations",
      "Complex Narratives",
      "Specialized Vocabulary",
      "Idiomatic Mastery",
      "Native-Level Fluency Drills"
    ];

    const level = params.proficiencyLevel.toLowerCase();
    const topics = level.includes('advanced')
      ? advancedTopics
      : level.includes('intermediate')
        ? intermediateTopics
        : beginnerTopics;

    const lessons = topics.map((topic, index) => ({
      title: topic,
      description: `Structured ${params.targetLanguage} lesson focused on ${topic.toLowerCase()}.`,
      orderIndex: index + 1,
      estimatedDuration: 25 + (index % 3) * 5,
      vocabulary: [
        {
          word: `${params.targetLanguage} term ${index + 1}A`,
          translation: `${params.nativeLanguage} translation A`,
          pronunciation: `phonetic-${index + 1}-a`,
          partOfSpeech: "noun",
          exampleSentences: [
            `Example sentence A for ${topic}`,
            `Example sentence B for ${topic}`
          ],
          culturalNote: `Commonly used in ${topic.toLowerCase()} contexts.`
        },
        {
          word: `${params.targetLanguage} term ${index + 1}B`,
          translation: `${params.nativeLanguage} translation B`,
          pronunciation: `phonetic-${index + 1}-b`,
          partOfSpeech: "verb",
          exampleSentences: [
            `Practical usage A for ${topic}`,
            `Practical usage B for ${topic}`
          ],
          culturalNote: `Use this expression to sound natural in everyday speech.`
        }
      ],
      grammar: [
        {
          topic: `Grammar pattern ${index + 1}`,
          explanation: `Core grammar structure for ${topic.toLowerCase()}.`,
          examples: [
            `Grammar example A for ${topic}`,
            `Grammar example B for ${topic}`
          ],
          rules: [
            "Apply the structure consistently in present tense",
            "Adjust word order in questions and negatives"
          ],
          culturalUsage: `Preferred usage differs by context and formality in ${params.targetLanguage}.`
        }
      ],
      culturalContent: [
        {
          topic: `${topic} in real life`,
          content: `Contextual guidance for applying ${topic.toLowerCase()} in authentic interactions.`,
          customs: [
            "Observe local greeting norms",
            "Match tone to social context",
            "Use polite forms with unfamiliar people",
            "Pay attention to response timing"
          ],
          traditions: [
            "Regional expression patterns",
            "Common conversational rituals",
            "Context-specific social habits"
          ],
          etiquette: [
            "Avoid direct translations of idioms",
            "Use respectful phrasing in formal settings",
            "Confirm understanding politely",
            "Adapt vocabulary to audience"
          ],
          practicalTips: [
            "Practice with short, high-frequency phrases",
            "Repeat difficult structures aloud",
            "Review mistakes from previous lessons",
            "Use role-play for retention"
          ],
          commonMistakes: [
            "Overusing literal translations",
            "Ignoring formality markers"
          ],
          regionalVariations: `Vocabulary and pronunciation can vary across ${params.targetLanguage}-speaking regions.`,
          relevance: "Builds practical fluency for everyday communication."
        }
      ]
    }));

    return {
      curriculum: {
        targetLanguage: params.targetLanguage,
        proficiencyLevel: params.proficiencyLevel,
        lessons
      }
    };
  }

  /**
   * Execute AI request with monitoring
   */
  async executeWithMonitoring<T>(
    serviceName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const responseTime = Date.now() - startTime;
      
      this.recordRequest(serviceName, true, responseTime);
      this.log(`${serviceName} request completed in ${responseTime}ms`, "info");
      
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordRequest(serviceName, false, responseTime);
      
      this.log(`${serviceName} request failed after ${responseTime}ms`, "error");
      throw error;
    }
  }

  /**
   * Reset metrics for a service
   */
  resetMetrics(service: string): void {
    const metrics = this.serviceMetrics.get(service);
    if (metrics) {
      metrics.requestCount = 0;
      metrics.successCount = 0;
      metrics.failureCount = 0;
      metrics.totalResponseTime = 0;
      metrics.lastHealthCheck = new Date();
      metrics.isHealthy = true;
      this.serviceMetrics.set(service, metrics);
    }
  }

  /**
   * Reset all metrics
   */
  resetAllMetrics(): void {
    this.serviceMetrics.forEach((_, service) => {
      this.resetMetrics(service);
    });
  }
}

export const aiServiceMonitor = new AIServiceMonitor();
