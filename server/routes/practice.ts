import { Router, Request, Response } from 'express';
import { requireAuth, getUserId } from '../middleware/auth';
import { geminiService } from '../services/GeminiService';
import { openAIService } from '../services/OpenAIService';
import { aiServiceLogger } from '../middleware/logging';
import { cache } from '../utils/cache';

const router = Router();

// Apply AI service logging to all practice routes
router.use(aiServiceLogger('Practice'));

/**
 * Generate a practice exercise based on type and language
 */
router.post('/practice/generate', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { language, type } = req.body;

    if (!language || !type) {
      return res.status(400).json({ 
        message: 'Language and practice type are required' 
      });
    }

    // Check cache first for faster response
    const cacheKey = `practice:${language}:${type}:${Date.now() % 10}`; // Rotate through 10 variations
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let exercise;

    // Generate exercise based on practice type with retry logic
    try {
      switch (type) {
        case 'vocabulary':
          exercise = await generateVocabularyExercise(language);
          break;
        case 'grammar':
          exercise = await generateGrammarExercise(language);
          break;
        case 'conversation':
          exercise = await generateConversationExercise(language);
          break;
        default:
          return res.status(400).json({ message: 'Invalid practice type' });
      }
    } catch (aiError) {
      // Fallback to OpenAI if Gemini fails
      console.warn('Gemini failed, falling back to OpenAI:', aiError);
      exercise = await generateFallbackExercise(language, type);
    }

    // Cache the exercise for 5 minutes
    cache.set(cacheKey, exercise, 300);

    res.json(exercise);
  } catch (error) {
    console.error('Error generating practice exercise:', error);
    res.status(500).json({ 
      message: 'Failed to generate exercise',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Check translation answer using AI
 */
router.post('/practice/check-translation', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { original, translation, language } = req.body;

    if (!original || !translation || !language) {
      return res.status(400).json({ 
        message: 'Original text, translation, and language are required' 
      });
    }

    // Use OpenAI to evaluate the translation
    const evaluation = await openAIService.evaluateTranslation({
      original,
      userTranslation: translation,
      targetLanguage: language
    });

    res.json({
      isCorrect: evaluation.isCorrect,
      feedback: evaluation.feedback,
      correctedTranslation: evaluation.correctedTranslation
    });
  } catch (error) {
    console.error('Error checking translation:', error);
    res.status(500).json({ 
      message: 'Failed to check translation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Analyze pronunciation using AI
 */
router.post('/practice/pronunciation', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { language, originalText, audioTranscription } = req.body;

    if (!language || !originalText || !audioTranscription) {
      return res.status(400).json({ 
        message: 'Language, original text, and audio transcription are required' 
      });
    }

    // Use Gemini to analyze pronunciation
    const prompt = `You are a pronunciation coach for ${language} language learning.

Original text: "${originalText}"
User's pronunciation (transcribed): "${audioTranscription}"

Analyze the pronunciation accuracy and provide:
1. An accuracy score (0-100)
2. Specific feedback on what was good and what needs improvement
3. 2-3 actionable tips for improvement

Return ONLY a valid JSON object with this structure:
{
  "accuracy": number (0-100),
  "feedback": "detailed feedback string",
  "improvementTips": ["tip 1", "tip 2", "tip 3"]
}`;

    const response = await geminiService.generateContent(prompt);
    
    // Parse JSON from response
    const cleaned = response.replace(/```json\n?|```\n?/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      res.json(result);
    } else {
      throw new Error('Failed to parse pronunciation analysis');
    }
  } catch (error) {
    console.error('Error analyzing pronunciation:', error);
    res.status(500).json({ 
      message: 'Failed to analyze pronunciation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper functions to generate different types of exercises

async function generateVocabularyExercise(language: string) {
  const prompt = `Generate a vocabulary practice exercise for ${language} language learning.
  
  Create a multiple-choice question that tests vocabulary knowledge.
  Include common, useful words that beginners to intermediate learners should know.
  
  Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
  {
    "question": "What does '[word in target language]' mean in English?",
    "options": ["option1", "option2", "option3", "option4"],
    "answer": "correct option",
    "type": "multiple-choice"
  }`;

  const response = await geminiService.generateContent(prompt);
  
  // Parse JSON from response - handle markdown code blocks
  const cleaned = response.replace(/```json\n?|```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error('Failed to parse exercise from AI response');
}

async function generateGrammarExercise(language: string) {
  const prompt = `Generate a grammar practice exercise for ${language} language learning.
  
  Create a fill-in-the-blank or sentence correction exercise that tests grammar knowledge.
  Focus on common grammar patterns and structures.
  
  Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
  {
    "question": "Complete the sentence: [sentence with blank]",
    "answer": "correct answer",
    "type": "translation"
  }`;

  const response = await geminiService.generateContent(prompt);
  
  // Parse JSON from response - handle markdown code blocks
  const cleaned = response.replace(/```json\n?|```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error('Failed to parse exercise from AI response');
}

async function generateConversationExercise(language: string) {
  const prompt = `Generate a conversation practice exercise for ${language} language learning.
  
  Create a realistic conversation scenario where the learner needs to respond appropriately.
  Use common everyday situations like greetings, ordering food, asking directions, etc.
  
  Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
  {
    "question": "How would you respond in ${language}: [scenario description]",
    "answer": "sample correct response in target language",
    "type": "translation"
  }`;

  const response = await geminiService.generateContent(prompt);
  
  // Parse JSON from response - handle markdown code blocks
  const cleaned = response.replace(/```json\n?|```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error('Failed to parse exercise from AI response');
}

async function generateFallbackExercise(language: string, type: string) {
  // Use OpenAI as fallback when Gemini fails
  const prompt = `Generate a ${type} practice exercise for ${language}. Return JSON: {question: string, answer: string, options?: string[], type: string}`;
  
  const response = await openAIService.generateCompletion(prompt, 'gpt-4o', 500, 0.7);
  const cleaned = response.replace(/```json\n?|```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  // Ultimate fallback - return a simple exercise
  return {
    question: `Translate "Hello" to ${language}`,
    answer: "Hello",
    type: "translation"
  };
}

export default router;
