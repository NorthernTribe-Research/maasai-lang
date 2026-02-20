import { BaseService } from "./BaseService";
import { GeminiService } from "./GeminiService";
import crypto from "crypto";

/**
 * AI Content Generator - Creates all learning content dynamically using AI
 * Generates lessons, exercises, vocabulary, grammar explanations, and assessments
 */
export class AIContentGenerator extends BaseService {
  private geminiService: GeminiService;
  private contentCache: Map<string, any> = new Map();

  constructor() {
    super();
    this.geminiService = new GeminiService();
    this.log("AI Content Generator initialized", "info");
  }

  /**
   * Generate a complete interactive lesson
   */
  async generateLesson(
    languageName: string,
    topic: string,
    difficulty: string,
    userProfile: {
      interests: string[];
      learningStyle: string;
      weakAreas: string[];
    }
  ): Promise<{
    introduction: string;
    sections: Array<{
      title: string;
      content: string;
      examples: string[];
      exercises: any[];
    }>;
    summary: string;
    keyTakeaways: string[];
  }> {
    const cacheKey = this.getCacheKey('lesson', languageName, topic, difficulty);
    if (this.contentCache.has(cacheKey)) {
      return this.contentCache.get(cacheKey);
    }

    try {
      const prompt = `Create a comprehensive interactive lesson for ${languageName} language learning.

Topic: ${topic}
Difficulty: ${difficulty}
User Interests: ${userProfile.interests.join(', ')}
Learning Style: ${userProfile.learningStyle}
Weak Areas: ${userProfile.weakAreas.join(', ')}

Create a lesson with:
1. Engaging introduction that relates to user interests
2. 3-4 main sections covering different aspects of the topic
3. Real-world examples for each section
4. Interactive exercises for practice
5. Summary reinforcing key points
6. Clear takeaways

Return JSON:
{
  "introduction": "engaging intro text",
  "sections": [
    {
      "title": "section title",
      "content": "detailed explanation",
      "examples": ["example1", "example2"],
      "exercises": [{"type": "...", "content": "...", "answer": "..."}]
    }
  ],
  "summary": "lesson summary",
  "keyTakeaways": ["takeaway1", "takeaway2", "takeaway3"]
}`;

      const content = await this.geminiService.generateContent(prompt);
      const jsonStr = content.replace(/```json|```/g, "").trim();
      const lesson = JSON.parse(jsonStr);
      
      this.contentCache.set(cacheKey, lesson);
      return lesson;
    } catch (error) {
      this.handleError(error, "generating lesson");
      return this.getDefaultLesson(topic, difficulty);
    }
  }

  /**
   * Generate vocabulary list with context and usage
   */
  async generateVocabulary(
    languageName: string,
    topic: string,
    difficulty: string,
    count: number = 10
  ): Promise<Array<{
    word: string;
    translation: string;
    pronunciation: string;
    examples: string[];
    commonUsage: string;
    difficulty: string;
  }>> {
    const cacheKey = this.getCacheKey('vocabulary', languageName, topic, difficulty);
    if (this.contentCache.has(cacheKey)) {
      return this.contentCache.get(cacheKey);
    }

    try {
      const prompt = `Generate ${count} essential vocabulary words for ${languageName} on topic: ${topic}, at ${difficulty} level.

For each word provide:
1. The word in target language
2. English translation
3. Pronunciation guide (phonetic)
4. 2-3 example sentences showing usage
5. Common usage context
6. Difficulty rating

Return JSON array of vocabulary items.`;

      const content = await this.geminiService.generateContent(prompt);
      const jsonStr = content.replace(/```json|```/g, "").trim();
      const vocabulary = JSON.parse(jsonStr);
      
      this.contentCache.set(cacheKey, vocabulary);
      return vocabulary;
    } catch (error) {
      this.handleError(error, "generating vocabulary");
      return this.getDefaultVocabulary(topic, count);
    }
  }

  /**
   * Generate interactive exercises
   */
  async generateExercises(
    languageName: string,
    concept: string,
    difficulty: string,
    exerciseType: 'multiple-choice' | 'fill-blank' | 'translation' | 'conversation',
    count: number = 5
  ): Promise<Array<{
    type: string;
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    hints: string[];
  }>> {
    const cacheKey = this.getCacheKey('exercises', languageName, concept, difficulty, exerciseType);
    if (this.contentCache.has(cacheKey)) {
      return this.contentCache.get(cacheKey);
    }

    try {
      const prompt = `Create ${count} ${exerciseType} exercises for ${languageName} focusing on: ${concept}, at ${difficulty} level.

Each exercise should:
1. Test understanding of the concept
2. Be clear and unambiguous
3. Include helpful hints
4. Provide detailed explanation of correct answer
${exerciseType === 'multiple-choice' ? '5. Have 4 plausible options' : ''}

Return JSON array of exercises.`;

      const content = await this.geminiService.generateContent(prompt);
      const jsonStr = content.replace(/```json|```/g, "").trim();
      const exercises = JSON.parse(jsonStr);
      
      this.contentCache.set(cacheKey, exercises);
      return exercises;
    } catch (error) {
      this.handleError(error, "generating exercises");
      return this.getDefaultExercises(concept, exerciseType, count);
    }
  }

  /**
   * Generate grammar explanations
   */
  async generateGrammarExplanation(
    languageName: string,
    grammarConcept: string,
    difficulty: string
  ): Promise<{
    concept: string;
    explanation: string;
    rules: string[];
    examples: Array<{ sentence: string; translation: string; annotation: string }>;
    commonMistakes: string[];
    tips: string[];
  }> {
    const cacheKey = this.getCacheKey('grammar', languageName, grammarConcept, difficulty);
    if (this.contentCache.has(cacheKey)) {
      return this.contentCache.get(cacheKey);
    }

    try {
      const prompt = `Explain the grammar concept "${grammarConcept}" in ${languageName} at ${difficulty} level.

Provide:
1. Clear, simple explanation
2. Key rules to remember
3. 5+ examples with translations and annotations
4. Common mistakes learners make
5. Helpful tips and memory aids

Return JSON with all components.`;

      const content = await this.geminiService.generateContent(prompt);
      const jsonStr = content.replace(/```json|```/g, "").trim();
      const grammar = JSON.parse(jsonStr);
      
      this.contentCache.set(cacheKey, grammar);
      return grammar;
    } catch (error) {
      this.handleError(error, "generating grammar explanation");
      return this.getDefaultGrammar(grammarConcept);
    }
  }

  /**
   * Generate conversational prompts
   */
  async generateConversationPrompts(
    languageName: string,
    scenario: string,
    difficulty: string
  ): Promise<Array<{
    prompt: string;
    suggestedResponses: string[];
    vocabulary: string[];
    culturalNotes: string;
  }>> {
    const cacheKey = this.getCacheKey('conversation', languageName, scenario, difficulty);
    if (this.contentCache.has(cacheKey)) {
      return this.contentCache.get(cacheKey);
    }

    try {
      const prompt = `Create conversation prompts for ${languageName} in scenario: ${scenario}, at ${difficulty} level.

Generate 5 conversation starters with:
1. Natural, realistic prompt
2. 3-4 possible responses a learner could give
3. Key vocabulary needed
4. Relevant cultural notes

Return JSON array of prompts.`;

      const content = await this.geminiService.generateContent(prompt);
      const jsonStr = content.replace(/```json|```/g, "").trim();
      const prompts = JSON.parse(jsonStr);
      
      this.contentCache.set(cacheKey, prompts);
      return prompts;
    } catch (error) {
      this.handleError(error, "generating conversation prompts");
      return this.getDefaultConversationPrompts(scenario);
    }
  }

  /**
   * Generate assessment questions
   */
  async generateAssessment(
    languageName: string,
    topics: string[],
    difficulty: string,
    skillTypes: string[]
  ): Promise<{
    introduction: string;
    questions: Array<{
      skillType: string;
      question: string;
      type: string;
      options?: string[];
      correctAnswer: string;
      points: number;
    }>;
    passingScore: number;
  }> {
    try {
      if (!this.openai) {
        return this.getDefaultAssessment(topics, difficulty);
      }

      const prompt = `Create a comprehensive assessment for ${languageName} covering: ${topics.join(', ')}.

Difficulty: ${difficulty}
Skill Types: ${skillTypes.join(', ')}

Generate 10-15 questions testing:
1. Vocabulary knowledge
2. Grammar understanding
3. Reading comprehension
4. Listening comprehension (describe)
5. Cultural knowledge

Return JSON with introduction, questions array, and passing score.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.5
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      this.handleError(error, "generating assessment");
      return this.getDefaultAssessment(topics, difficulty);
    }
  }

  /**
   * Generate cultural content
   */
  async generateCulturalContent(
    languageName: string,
    topic: string
  ): Promise<{
    title: string;
    content: string;
    keyPoints: string[];
    vocabulary: Array<{ word: string; meaning: string }>;
    funFacts: string[];
  }> {
    const cacheKey = this.getCacheKey('cultural', languageName, topic);
    if (this.contentCache.has(cacheKey)) {
      return this.contentCache.get(cacheKey);
    }

    try {
      const prompt = `Create engaging cultural content about ${topic} in ${languageName}-speaking cultures.

Provide:
1. Informative, engaging content
2. Key cultural points
3. Related vocabulary
4. Interesting fun facts

Return JSON with all components.`;

      const content = await this.geminiService.generateContent(prompt);
      const jsonStr = content.replace(/```json|```/g, "").trim();
      const cultural = JSON.parse(jsonStr);
      
      this.contentCache.set(cacheKey, cultural);
      return cultural;
    } catch (error) {
      this.handleError(error, "generating cultural content");
      return this.getDefaultCultural(topic);
    }
  }

  // Helper methods

  private getCacheKey(...parts: string[]): string {
    const key = parts.join('|');
    return crypto.createHash('md5').update(key).digest('hex');
  }

  private getDefaultLesson(topic: string, difficulty: string) {
    return {
      introduction: `Welcome to this ${difficulty} level lesson on ${topic}!`,
      sections: [
        {
          title: `Understanding ${topic}`,
          content: `Let's explore ${topic} in detail.`,
          examples: [`Example of ${topic}`],
          exercises: [{ type: 'practice', content: `Practice ${topic}`, answer: 'example' }]
        }
      ],
      summary: `You've learned about ${topic}.`,
      keyTakeaways: [`Master ${topic} through practice`, 'Review regularly']
    };
  }

  private getDefaultVocabulary(topic: string, count: number) {
    return Array.from({ length: count }, (_, i) => ({
      word: `word${i + 1}`,
      translation: `translation${i + 1}`,
      pronunciation: `pronunciation`,
      examples: [`Example sentence ${i + 1}`],
      commonUsage: `Used in ${topic} contexts`,
      difficulty: 'medium'
    }));
  }

  private getDefaultExercises(concept: string, type: string, count: number) {
    return Array.from({ length: count }, (_, i) => ({
      type,
      question: `Question ${i + 1} about ${concept}`,
      options: type === 'multiple-choice' ? ['Option A', 'Option B', 'Option C', 'Option D'] : undefined,
      correctAnswer: type === 'multiple-choice' ? 'Option A' : 'answer',
      explanation: `This tests understanding of ${concept}`,
      hints: [`Think about ${concept}`, 'Consider the context']
    }));
  }

  private getDefaultGrammar(concept: string) {
    return {
      concept,
      explanation: `${concept} is an important grammar concept.`,
      rules: [`Rule 1 for ${concept}`, 'Rule 2'],
      examples: [
        { sentence: 'Example sentence', translation: 'Translation', annotation: 'Notes' }
      ],
      commonMistakes: ['Common mistake 1'],
      tips: ['Remember this tip']
    };
  }

  private getDefaultConversationPrompts(scenario: string) {
    return [
      {
        prompt: `Let's practice ${scenario}`,
        suggestedResponses: ['Response 1', 'Response 2'],
        vocabulary: ['word1', 'word2'],
        culturalNotes: 'Cultural context'
      }
    ];
  }

  private getDefaultAssessment(topics: string[], difficulty: string) {
    return {
      introduction: `Assessment covering ${topics.join(', ')} at ${difficulty} level`,
      questions: [
        {
          skillType: 'vocabulary',
          question: 'Test question',
          type: 'multiple-choice',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
          points: 10
        }
      ],
      passingScore: 70
    };
  }

  private getDefaultCultural(topic: string) {
    return {
      title: `Cultural Insights: ${topic}`,
      content: `Exploring ${topic} in cultural context`,
      keyPoints: ['Key point 1', 'Key point 2'],
      vocabulary: [{ word: 'word', meaning: 'meaning' }],
      funFacts: ['Interesting fact']
    };
  }

  /**
   * Clear cache for fresh content
   */
  clearCache(): void {
    this.contentCache.clear();
    this.log("Content cache cleared", "info");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.contentCache.size,
      keys: Array.from(this.contentCache.keys())
    };
  }
}

export const aiContentGenerator = new AIContentGenerator();
