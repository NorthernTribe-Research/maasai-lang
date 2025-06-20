import OpenAI from 'openai';
import { BaseService } from './BaseService';
import fs from 'fs';
import FormData from 'form-data';

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  confidence?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

export interface SpeechAnalysis {
  transcription: TranscriptionResult;
  pronunciation: {
    accuracy: number;
    issues: Array<{
      word: string;
      expected: string;
      actual: string;
      suggestion: string;
    }>;
  };
  fluency: {
    wordsPerMinute: number;
    pauseCount: number;
    fillerWords: string[];
  };
}

/**
 * OpenAI Whisper service for speech-to-text and pronunciation analysis
 */
export class WhisperService extends BaseService {
  private openai: OpenAI;
  private isAvailable: boolean = false;

  constructor() {
    super();
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey !== 'demo-api-key') {
      this.openai = new OpenAI({ apiKey });
      this.isAvailable = true;
      this.log("Whisper service initialized with API key", "info");
    } else {
      this.log("Whisper service initialized without API key - limited functionality", "warn");
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    options: {
      language?: string;
      prompt?: string;
      temperature?: number;
      responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
    } = {}
  ): Promise<TranscriptionResult> {
    if (!this.isAvailable) {
      throw new Error("Whisper service not available - OpenAI API key not configured");
    }

    try {
      // Create a temporary file for the audio
      const tempFilePath = `/tmp/audio_${Date.now()}.webm`;
      fs.writeFileSync(tempFilePath, audioBuffer);

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempFilePath),
        model: "whisper-1",
        language: options.language,
        prompt: options.prompt,
        response_format: options.responseFormat || 'verbose_json',
        temperature: options.temperature || 0
      });

      // Clean up temporary file
      fs.unlinkSync(tempFilePath);

      if (typeof transcription === 'string') {
        return { text: transcription };
      }

      return {
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        segments: transcription.segments?.map(segment => ({
          start: segment.start,
          end: segment.end,
          text: segment.text
        }))
      };
    } catch (error) {
      this.handleError(error, "WhisperService.transcribeAudio");
      throw error;
    }
  }

  /**
   * Analyze pronunciation by comparing transcription with expected text
   */
  async analyzePronunciation(
    audioBuffer: Buffer,
    expectedText: string,
    targetLanguage: string
  ): Promise<SpeechAnalysis> {
    try {
      // Get transcription
      const transcription = await this.transcribeAudio(audioBuffer, {
        language: targetLanguage,
        prompt: expectedText,
        responseFormat: 'verbose_json'
      });

      // Analyze pronunciation accuracy
      const pronunciation = await this.comparePronunciation(
        transcription.text,
        expectedText,
        targetLanguage
      );

      // Analyze fluency metrics
      const fluency = this.analyzeFluency(transcription);

      return {
        transcription,
        pronunciation,
        fluency
      };
    } catch (error) {
      this.handleError(error, "WhisperService.analyzePronunciation");
      return this.getDefaultAnalysis(expectedText);
    }
  }

  /**
   * Compare actual transcription with expected text for pronunciation analysis
   */
  private async comparePronunciation(
    actualText: string,
    expectedText: string,
    targetLanguage: string
  ): Promise<{
    accuracy: number;
    issues: Array<{
      word: string;
      expected: string;
      actual: string;
      suggestion: string;
    }>;
  }> {
    try {
      const prompt = `
        Analyze pronunciation accuracy by comparing the expected text with what was actually spoken.
        
        Expected: "${expectedText}"
        Actual: "${actualText}"
        Language: ${targetLanguage}
        
        Provide detailed pronunciation analysis:
        1. Calculate overall accuracy percentage
        2. Identify specific pronunciation issues
        3. Suggest improvements for mispronounced words
        
        Return JSON:
        {
          "accuracy": 0-100,
          "issues": [
            {
              "word": "word_from_expected",
              "expected": "correct_pronunciation",
              "actual": "what_was_said",
              "suggestion": "how_to_improve"
            }
          ]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      this.handleError(error, "WhisperService.comparePronunciation");
      return {
        accuracy: 70,
        issues: []
      };
    }
  }

  /**
   * Analyze fluency metrics from transcription
   */
  private analyzeFluency(transcription: TranscriptionResult): {
    wordsPerMinute: number;
    pauseCount: number;
    fillerWords: string[];
  } {
    const words = transcription.text.split(/\s+/).filter(word => word.length > 0);
    const duration = transcription.duration || 1;
    const wordsPerMinute = Math.round((words.length / duration) * 60);

    // Detect filler words
    const fillerWords = ['um', 'uh', 'er', 'ah', 'like', 'you know'];
    const detectedFillers = words.filter(word => 
      fillerWords.includes(word.toLowerCase().replace(/[^\w]/g, ''))
    );

    // Estimate pause count from segments
    let pauseCount = 0;
    if (transcription.segments && transcription.segments.length > 1) {
      for (let i = 1; i < transcription.segments.length; i++) {
        const gap = transcription.segments[i].start - transcription.segments[i-1].end;
        if (gap > 0.5) { // Consider gaps > 0.5 seconds as pauses
          pauseCount++;
        }
      }
    }

    return {
      wordsPerMinute,
      pauseCount,
      fillerWords: detectedFillers
    };
  }

  /**
   * Generate pronunciation exercises based on user's weak areas
   */
  async generatePronunciationExercises(
    targetLanguage: string,
    weakAreas: string[],
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<Array<{
    id: string;
    text: string;
    phonetics: string;
    focusSound: string;
    tips: string[];
  }>> {
    try {
      const prompt = `
        Create pronunciation exercises for ${targetLanguage} language.
        
        Weak areas to focus on: ${weakAreas.join(', ')}
        Difficulty level: ${difficulty}
        
        Generate 5-8 pronunciation exercises that:
        1. Target the specific weak areas
        2. Include phonetic transcriptions
        3. Focus on challenging sounds
        4. Provide helpful pronunciation tips
        5. Progress from simple to complex
        
        Return JSON array:
        [
          {
            "id": "exercise_id",
            "text": "text_to_practice",
            "phonetics": "phonetic_transcription",
            "focusSound": "target_sound_or_pattern",
            "tips": ["tip1", "tip2", "tip3"]
          }
        ]
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return result.exercises || [];
    } catch (error) {
      this.handleError(error, "WhisperService.generatePronunciationExercises");
      return [];
    }
  }

  /**
   * Real-time pronunciation coaching
   */
  async providePronunciationCoaching(
    audioBuffer: Buffer,
    targetPhrase: string,
    targetLanguage: string,
    userLevel: string
  ): Promise<{
    transcription: string;
    feedback: string;
    score: number;
    improvements: string[];
    nextSteps: string[];
  }> {
    try {
      const analysis = await this.analyzePronunciation(
        audioBuffer,
        targetPhrase,
        targetLanguage
      );

      const prompt = `
        Provide encouraging pronunciation coaching for a ${userLevel} level learner.
        
        Target phrase: "${targetPhrase}"
        What they said: "${analysis.transcription.text}"
        Pronunciation accuracy: ${analysis.pronunciation.accuracy}%
        Issues found: ${JSON.stringify(analysis.pronunciation.issues)}
        
        Create supportive coaching feedback that:
        1. Acknowledges their effort positively
        2. Highlights what they did well
        3. Gently corrects major issues
        4. Provides specific improvement tips
        5. Suggests next practice steps
        6. Maintains encouraging tone
        
        Return JSON:
        {
          "feedback": "encouraging_feedback_message",
          "score": 0-100,
          "improvements": ["specific_improvement1", "specific_improvement2"],
          "nextSteps": ["next_practice_step1", "next_practice_step2"]
        }
      `;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.8
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        transcription: analysis.transcription.text,
        feedback: result.feedback || "Good effort! Keep practicing.",
        score: result.score || analysis.pronunciation.accuracy,
        improvements: result.improvements || [],
        nextSteps: result.nextSteps || []
      };
    } catch (error) {
      this.handleError(error, "WhisperService.providePronunciationCoaching");
      return {
        transcription: "Could not analyze speech",
        feedback: "Please try speaking more clearly and try again.",
        score: 0,
        improvements: ["Speak more slowly", "Pronounce each word clearly"],
        nextSteps: ["Practice the phrase again", "Focus on individual sounds"]
      };
    }
  }

  /**
   * Check if service is available
   */
  isServiceAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Default analysis fallback
   */
  private getDefaultAnalysis(expectedText: string): SpeechAnalysis {
    return {
      transcription: {
        text: "Audio transcription unavailable"
      },
      pronunciation: {
        accuracy: 0,
        issues: []
      },
      fluency: {
        wordsPerMinute: 0,
        pauseCount: 0,
        fillerWords: []
      }
    };
  }
}