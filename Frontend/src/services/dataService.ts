import API from './api';
import { authService } from '@/utils/auth';

export interface QuestionPaper {
  id: string;
  subject: string;
  class_name: string;
  total_marks: number;
  difficulty: string;
  board: string;
  content: string;
  chapters: string[];
  created_by: number;
  created_at: string;
  class: string;
  totalMarks: number;
  createdAt: string;
}

export interface StudentSubmission {
  id: string;
  questionPaperId: string;
  studentId: number;
  studentName: string;
  answers: string;
  submittedAt: string;
  evaluated: boolean;
  evaluation?: any;
  paper?: any;
}

export const dataService = {
  getQuestionPapers: async (token: string): Promise<QuestionPaper[]> => {
    try {
      const response = await API.get('/papers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch question papers:', error);
      return [];
    }
  },

  getSubmissionDetails: async (submissionId: string, token: string): Promise<StudentSubmission | null> => {
    try {
      const response = await API.get(`/submission/${submissionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch submission details:', error);
      return null;
    }
  },

  solveQuestionPaper: async (paperId: string, answers: any, token: string) => {
    const authState = authService.getAuthState();
    if (!authState.user) {
      throw new Error("User not authenticated");
    }
    const payload = {
      question_paper_id: paperId,
      student_id: authState.user.id,
      student_name: authState.user.name,
      answers: JSON.stringify(answers),
    };
    return await API.post('/submissions', payload, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  viewSubmissions: async (paperId: string, token: string): Promise<StudentSubmission[]> => {
    try {
      const response = await API.get(`/submissions?paper_id=${paperId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
      return [];
    }
  },

  evaluateSubmission: async (submissionId: string, evaluationData: any, token: string) => {
    return await API.patch(`/submissions/${submissionId}`, evaluationData, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  getAllSubmissions: async (token: string): Promise<StudentSubmission[]> => {
    try {
      const response = await API.get('/submissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch all submissions:', error);
      return [];
    }
  },

  saveQuestionPaper: async (payload: any, token: string) => {
    try {
      const response = await API.post('/papers', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to save question paper:', error);
      throw error;
    }
  }
};
