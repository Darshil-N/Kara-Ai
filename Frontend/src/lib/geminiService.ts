/**
 * Gemini 2.5 Flash Service for AI Interview System
 * Optimized for free tier usage (15 requests per minute)
 * Uses efficient prompts to minimize API calls and token usage
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Types for interview data
interface InterviewContext {
  targetRole: string;
  interviewStyle: string;
  interviewerType: string;
}

interface QuestionGenerationInput {
  targetRole: string;
  interviewStyle: string;
  interviewerType: string;
  previousQuestions?: Array<{
    question: string;
    answer: string;
    timestamp: { start: number; end: number };
  }>;
}

interface AnswerAnalysisInput {
  question: string;
  answer: string;
  context: InterviewContext;
  timeline: {
    start: number;
    end: number;
    duration: number;
  };
}

interface AnalysisResult {
  score: number; // 0-100
  confidence: number; // 0-100
  communication: number; // 0-100
  content: number; // 0-100
  feedback: string;
  strengths: string[];
  improvements: string[];
}

interface QuestionResponse {
  success: boolean;
  question?: string;
  error?: string;
}

interface AnalysisResponse {
  success: boolean;
  analysis?: AnalysisResult;
  error?: string;
}

interface SummaryResponse {
  success: boolean;
  summary?: {
    overallScore: number;
    confidenceLevel: number;
    communicationScore: number;
    contentScore: number;
    summary: string;
    suggestions: string[];
    keyStrengths: string[];
    areasForImprovement: string[];
  };
  error?: string;
}

class GeminiInterviewService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Use Gemini 2.5 Flash for free tier
      this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    } else {
      console.warn('Gemini API key not found. Please add VITE_GEMINI_API_KEY to your .env file');
    }
  }

  /**
   * Generate the first interview question
   */
  async generateFirstQuestion(context: InterviewContext): Promise<QuestionResponse> {
    if (!this.model) {
      return { success: false, error: 'Gemini API not configured' };
    }

    const prompt = `You are an experienced ${context.interviewerType.toLowerCase()} interviewer. Generate ONE opening question for a ${context.targetRole} interview using ${context.interviewStyle.toLowerCase()} style.

CONTEXT:
- Role: ${context.targetRole}
- Style: ${context.interviewStyle}
- Tone: ${context.interviewerType}

REQUIREMENTS:
- Return ONLY the question text
- No explanations or additional text
- Question should be engaging and role-appropriate
- Maximum 25 words

EXAMPLE OUTPUT:
"Tell me about a challenging project you worked on and how you overcame the obstacles you faced."`;

    try {
      const result = await this.model.generateContent(prompt);
      const question = result.response.text().trim();
      
      return {
        success: true,
        question: question.replace(/['"]/g, '')
      };
    } catch (error) {
      console.error('Gemini first question error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate next question based on previous answers
   */
  async generateNextQuestion(input: QuestionGenerationInput): Promise<QuestionResponse> {
    if (!this.model) {
      return { success: false, error: 'Gemini API not configured' };
    }

    const previousQAs = input.previousQuestions?.slice(-2) || []; // Last 2 Q&As only
    const qaHistory = previousQAs.map((qa, i) => `Q${i+1}: ${qa.question}\nA${i+1}: ${qa.answer.substring(0, 200)}`).join('\n\n');

    const prompt = `Generate the next interview question for ${input.targetRole} position.

CONTEXT:
- Role: ${input.targetRole}
- Style: ${input.interviewStyle}
- Interviewer: ${input.interviewerType}

PREVIOUS Q&A:
${qaHistory}

REQUIREMENTS:
- Return ONLY the question text
- Build on previous answers
- Probe deeper or explore new areas
- Maximum 25 words
- No repetition of previous questions

OUTPUT FORMAT: Just the question text`;

    try {
      const result = await this.model.generateContent(prompt);
      const question = result.response.text().trim();
      
      return {
        success: true,
        question: question.replace(/['"]/g, '')
      };
    } catch (error) {
      console.error('Gemini next question error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyze answer with timeline consideration
   */
  async analyzeAnswer(
    question: string,
    answer: string,
    context: InterviewContext,
    timeline: { start: number; end: number; duration: number },
    extras?: { emotion?: string }
  ): Promise<AnalysisResponse> {
    if (!this.model) {
      return { success: false, error: 'Gemini API not configured' };
    }

    const durationSec = Math.round(timeline.duration / 1000);
    const answerLength = answer.length;

    const prompt = `Analyze this ${context.targetRole} interview answer. Provide scores and brief feedback.

QUESTION: ${question}
ANSWER: ${answer}

${extras?.emotion ? `EMOTION: ${extras.emotion}
` : ''}

METRICS:
- Duration: ${durationSec}s
- Length: ${answerLength} chars
- Role: ${context.targetRole}
- Style: ${context.interviewStyle}

OUTPUT (JSON only):
{
  "score": 85,
  "confidence": 90,
  "communication": 80,
  "content": 85,
  "feedback": "Strong technical knowledge. Could improve structure.",
  "strengths": ["Clear explanation", "Good examples"],
  "improvements": ["Add more structure", "Include metrics"]
}

SCORING CRITERIA:
- Score: Overall answer quality (0-100)
- Confidence: Speaking confidence & clarity (0-100)
- Communication: Structure, flow, engagement (0-100)  
- Content: Relevance, depth, accuracy (0-100)
- If EMOTION is provided, factor it into Confidence and Communication scoring where relevant
- Keep feedback under 60 chars
- Max 2 strengths/improvements each`;

    try {
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from Gemini');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      
      return {
        success: true,
        analysis: {
          score: Math.max(0, Math.min(100, analysis.score || 0)),
          confidence: Math.max(0, Math.min(100, analysis.confidence || 0)),
          communication: Math.max(0, Math.min(100, analysis.communication || 0)),
          content: Math.max(0, Math.min(100, analysis.content || 0)),
          feedback: analysis.feedback || 'No feedback available',
          strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
          improvements: Array.isArray(analysis.improvements) ? analysis.improvements : []
        }
      };
    } catch (error) {
      console.error('Gemini analysis error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate model answer for comparison
   */
  async generateModelAnswer(question: string, context: InterviewContext): Promise<{ success: boolean; modelAnswer?: string; error?: string }> {
    if (!this.model) {
      return { success: false, error: 'Gemini API not configured' };
    }

    const prompt = `Provide a model answer for this ${context.targetRole} interview question:

QUESTION: ${question}

REQUIREMENTS:
- Concise professional answer (max 100 words)
- Include key points for ${context.targetRole}
- Structure: Situation-Action-Result when applicable
- No explanatory text, just the answer`;

    try {
      const result = await this.model.generateContent(prompt);
      const modelAnswer = result.response.text().trim();
      
      return {
        success: true,
        modelAnswer
      };
    } catch (error) {
      console.error('Gemini model answer error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate final interview summary
   */
  async generateFinalSummary(input: QuestionGenerationInput): Promise<SummaryResponse> {
    if (!this.model) {
      return { success: false, error: 'Gemini API not configured' };
    }

    const qaHistory = input.previousQuestions?.map((qa, i) => 
      `Q${i+1}: ${qa.question}\nA${i+1}: ${qa.answer.substring(0, 150)}`
    ).join('\n\n') || '';

    const prompt = `Generate final interview summary for ${input.targetRole} candidate.

INTERVIEW DATA:
${qaHistory}

OUTPUT (JSON only):
{
  "overallScore": 78,
  "confidenceLevel": 82,
  "communicationScore": 75,
  "contentScore": 80,
  "summary": "Candidate shows solid technical skills with room for improvement in communication structure.",
  "suggestions": ["Practice the STAR method", "Prepare specific examples", "Work on concise explanations"],
  "keyStrengths": ["Technical knowledge", "Problem-solving approach"],
  "areasForImprovement": ["Communication clarity", "Answer structure"]
}

REQUIREMENTS:
- All scores 0-100
- Summary max 100 chars
- Max 3 suggestions/strengths/improvements each
- Each item max 25 chars`;

    try {
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text().trim();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from Gemini');
      }

      const summary = JSON.parse(jsonMatch[0]);
      
      return {
        success: true,
        summary: {
          overallScore: Math.max(0, Math.min(100, summary.overallScore || 0)),
          confidenceLevel: Math.max(0, Math.min(100, summary.confidenceLevel || 0)),
          communicationScore: Math.max(0, Math.min(100, summary.communicationScore || 0)),
          contentScore: Math.max(0, Math.min(100, summary.contentScore || 0)),
          summary: summary.summary || 'Summary not available',
          suggestions: Array.isArray(summary.suggestions) ? summary.suggestions : [],
          keyStrengths: Array.isArray(summary.keyStrengths) ? summary.keyStrengths : [],
          areasForImprovement: Array.isArray(summary.areasForImprovement) ? summary.areasForImprovement : []
        }
      };
    } catch (error) {
      console.error('Gemini summary error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
export const geminiService = new GeminiInterviewService();

// Export types
export type {
  InterviewContext,
  QuestionGenerationInput,
  AnswerAnalysisInput,
  AnalysisResult,
  QuestionResponse,
  AnalysisResponse,
  SummaryResponse
};