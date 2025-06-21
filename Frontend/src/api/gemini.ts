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
    console.log('Token being used:', token ? `${token.substring(0, 20)}...` : 'No token');
    console.log('Request params:', params);
    
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
    console.error('Response data:', error.response?.data);
    
    // Check if token has expired
    if (error.response?.status === 401 && error.response?.data?.msg === 'Token has expired') {
      // Clear the expired token and redirect to login
      sessionStorage.removeItem('exam-spark-token');
      sessionStorage.removeItem('exam-spark-user');
      window.location.href = '/login';
      throw new Error('Your session has expired. Please log in again.');
    }
    
    // Check for rate limiting
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    }
    
    const errorMsg = error.response?.data?.error || 'Failed to generate question paper. Please try again.';
    throw new Error(errorMsg);
  }
}
