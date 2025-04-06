import OpenAI from "openai";

// Check if OpenAI API key is available
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey && process.env.NODE_ENV === 'production') {
  console.error('OPENAI_API_KEY is not set in production environment. AI features will not function correctly.');
}

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export const openai = new OpenAI({ apiKey: apiKey || "demo-api-key" });

// Generate language learning exercises
export async function generateExercise(language: string, level: string, type: string): Promise<{
  question: string;
  answer: string;
  options?: string[];
}> {
  try {
    const prompt = `
      Create a ${type} exercise for ${language} language at ${level} level.
      Return JSON in the following format:
      {
        "question": "The question or prompt",
        "answer": "The correct answer",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"] (for multiple choice only)
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || '{}';
    const result = JSON.parse(content);
    return {
      question: result.question,
      answer: result.answer,
      options: result.options,
    };
  } catch (error) {
    console.error("Failed to generate exercise:", error);
    return {
      question: `Default ${type} question for ${language} at ${level} level.`,
      answer: "Default answer",
      options: type === "multiple-choice" ? ["Option 1", "Option 2", "Option 3", "Option 4"] : undefined,
    };
  }
}

// Generate language learning tips
export async function generateLanguageTip(language: string): Promise<string> {
  try {
    const prompt = `Provide a short, helpful tip for learning ${language}. Make it concise and practical.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message.content || `Here's a tip for learning ${language}: Practice every day, even if just for a few minutes.`;
  } catch (error) {
    console.error("Failed to generate language tip:", error);
    return `Here's a tip for learning ${language}: Practice every day, even if just for a few minutes.`;
  }
}

// Check translation accuracy
export async function checkTranslation(original: string, translation: string, language: string): Promise<{
  isCorrect: boolean;
  feedback: string;
  correctedTranslation?: string;
}> {
  try {
    const prompt = `
      Check if this translation is correct.
      Original: "${original}"
      Translation to ${language}: "${translation}"
      
      Return JSON with the following format:
      {
        "isCorrect": true/false,
        "feedback": "Specific feedback about the translation",
        "correctedTranslation": "The correct translation if the provided one is wrong"
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to check translation:", error);
    return {
      isCorrect: false, // Default to false to encourage the user to try again
      feedback: "We couldn't verify your translation. Please try again.",
    };
  }
}

// Generate personalized study plan
export async function generateStudyPlan(
  language: string, 
  level: string, 
  interests: string[], 
  timeAvailable: number
): Promise<{
  title: string;
  description: string;
  activities: Array<{
    name: string;
    duration: number;
    description: string;
    type: string;
  }>;
}> {
  try {
    const prompt = `
      Create a personalized study plan for learning ${language} at ${level} level.
      Interests: ${interests.join(", ")}
      Time available: ${timeAvailable} minutes per day.
      
      Return JSON with the following format:
      {
        "title": "Title of the study plan",
        "description": "Brief description of the overall plan",
        "activities": [
          {
            "name": "Activity name",
            "duration": duration in minutes,
            "description": "What to do in this activity",
            "type": "vocabulary/grammar/conversation/listening/reading"
          }
        ]
      }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to generate study plan:", error);
    return {
      title: `${language} Learning Plan`,
      description: `A basic study plan for learning ${language} at ${level} level.`,
      activities: [
        {
          name: "Vocabulary Practice",
          duration: Math.floor(timeAvailable / 3),
          description: "Learn and practice new vocabulary words.",
          type: "vocabulary"
        },
        {
          name: "Grammar Review",
          duration: Math.floor(timeAvailable / 3),
          description: "Review key grammar concepts.",
          type: "grammar"
        },
        {
          name: "Listening Practice",
          duration: Math.floor(timeAvailable / 3),
          description: "Listen to native speakers and practice comprehension.",
          type: "listening"
        }
      ]
    };
  }
}