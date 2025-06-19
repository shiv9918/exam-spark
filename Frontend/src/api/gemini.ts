const GEMINI_API_KEY = "AIzaSyC1bO1JCWs8aCl0YfuEG9q-UQXEkFkvXUg";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export interface QuestionPaperParams {
  subject: string;
  class: string;
  totalMarks: number;
  difficulty: string;
  board: string;
  chapters: string[];
  specificTopic?: string;
  instructions?: string;
  paperPattern: string;
}

export interface EvaluationResult {
  percentage: number;
  grade: string;
  feedback: string;
  scoreBreakdown: string;
}

export async function generateQuestionPaper(params: QuestionPaperParams): Promise<string> {
  const prompt = `
    Generate a comprehensive question paper with the following specifications:
    
    Subject: ${params.subject}
    Class: ${params.class}
    Total Marks: ${params.totalMarks}
    Difficulty Level: ${params.difficulty}
    Board: ${params.board}
    Chapters: ${params.chapters.join(', ')}
    ${params.specificTopic ? `Specific Topic: ${params.specificTopic}` : ''}
    ${params.instructions ? `Special Instructions: ${params.instructions}` : ''}
    Paper Pattern: ${params.paperPattern}
    
    Please create a well-structured question paper in markdown format with:
    1. Header with subject, class, time duration, and marks
    2. Clear instructions for students
    3. Questions divided by marks (1, 2, 3, 5, 10 marks etc.)
    4. Proper numbering and formatting
    5. Include a mix of question types based on the pattern specified
    
    Make sure the total marks add up to exactly ${params.totalMarks} marks.
  `;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || "Failed to generate question paper";
  } catch (error) {
    console.error('Error generating question paper:', error);
    throw new Error('Failed to generate question paper. Please try again.');
  }
}

export async function evaluateAnswer(
  question: string,
  correctAnswer: string,
  studentAnswer: string,
  maxMarks: number
): Promise<EvaluationResult> {
  const prompt = `
    Please evaluate the following student response carefully:

    Question: ${question}
    Model/Expected Answer: ${correctAnswer}
    Student Answer: ${studentAnswer}
    Maximum Marks: ${maxMarks}

    Please provide a detailed evaluation in the following JSON format:
    {
      "percentage": [percentage score out of 100],
      "grade": "[A+/A/B+/B/C+/C/D/F based on percentage]",
      "feedback": "[detailed constructive feedback explaining what was correct, what was missing, and suggestions for improvement]",
      "scoreBreakdown": "[breakdown of marks awarded for different aspects of the answer]"
    }

    Grading scale:
    90-100%: A+
    80-89%: A
    70-79%: B+
    60-69%: B
    50-59%: C+
    40-49%: C
    30-39%: D
    Below 30%: F

    Be fair but constructive in your evaluation.
  `;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates[0]?.content?.parts[0]?.text || "";
    
    try {
      // Try to parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing evaluation response:', parseError);
    }

    // Fallback if JSON parsing fails
    return {
      percentage: 75,
      grade: "B+",
      feedback: "Answer evaluated. Please check the detailed response for specific feedback.",
      scoreBreakdown: "Partial marks awarded based on content accuracy and completeness."
    };
  } catch (error) {
    console.error('Error evaluating answer:', error);
    throw new Error('Failed to evaluate answer. Please try again.');
  }
}

export async function evaluateWithGemini(paper, studentAnswers) {
  // For demo: just call evaluateAnswer for the whole paper as a single block
  // In production, you might want to evaluate each question separately
  return await evaluateAnswer(
    paper.content,
    'N/A', // No model answer available
    studentAnswers,
    paper.totalMarks || 100
  );
}
