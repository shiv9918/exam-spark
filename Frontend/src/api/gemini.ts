import API from '../services/api';

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

export async function generateQuestionPaper(params: QuestionPaperParams, token: string): Promise<string> {
  try {
    const response = await API.post('/generate-paper', params, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status !== 200) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = response.data;
    return data.content || "Failed to generate question paper content.";
    
  } catch (error: any) {
    console.error('Error generating question paper:', error);
    const errorMsg = error.response?.data?.error || 'Failed to generate question paper. Please try again.';
    throw new Error(errorMsg);
  }
}
