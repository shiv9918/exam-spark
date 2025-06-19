import API from './api';

export interface QuestionPaper {
  id: string;
  subject: string;
  class: string;
  totalMarks: number;
  difficulty: string;
  board: string;
  content: string;
  createdBy: string;
  createdAt: string;
  chapters: string[];
}

export interface StudentSubmission {
  id: string;
  questionPaperId: string;
  studentId: string;
  studentName: string;
  answers: string;
  submittedAt: string;
  evaluated: boolean;
  evaluation?: {
    percentage: number;
    grade: string;
    feedback: string;
    scoreBreakdown: string;
    evaluatedAt: string;
  };
}

class DataService {
  private readonly PAPERS_KEY = 'exam-spark-papers';
  private readonly SUBMISSIONS_KEY = 'exam-spark-submissions';

  // Question Papers
  async saveQuestionPaper(paper: any, token: string): Promise<QuestionPaper> {
    const res = await API.post('/papers', paper, {
    headers: {
      'Authorization': `Bearer ${token}`
      }
  });
    if (res.status !== 200 && res.status !== 201) throw new Error('Failed to save question paper');
    const result = res.data;
  return { ...paper, id: result.paper_id, createdAt: new Date().toISOString() };
}

  getQuestionPapers(): QuestionPaper[] {
    try {
      const papers = localStorage.getItem(this.PAPERS_KEY);
      return papers ? JSON.parse(papers) : [];
    } catch (error) {
      return [];
    }
  }

  async getQuestionPaperById(id: string, token: string): Promise<QuestionPaper | null> {
    try {
      const res = await API.get(`/papers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 200) {
        return res.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Student Submissions
  saveSubmission(submission: Omit<StudentSubmission, 'id' | 'submittedAt' | 'evaluated'>): StudentSubmission {
    const submissions = this.getSubmissions();
    const newSubmission: StudentSubmission = {
      ...submission,
      id: `submission_${Date.now()}`,
      submittedAt: new Date().toISOString(),
      evaluated: false
    };
    submissions.push(newSubmission);
    localStorage.setItem(this.SUBMISSIONS_KEY, JSON.stringify(submissions));
    return newSubmission;
  }

  getSubmissions(): StudentSubmission[] {
    try {
      const submissions = localStorage.getItem(this.SUBMISSIONS_KEY);
      return submissions ? JSON.parse(submissions) : [];
    } catch (error) {
      return [];
    }
  }

  getSubmissionsByStudent(studentId: string): StudentSubmission[] {
    return this.getSubmissions().filter(sub => sub.studentId === studentId);
  }

  updateSubmissionEvaluation(submissionId: string, evaluation: StudentSubmission['evaluation']): void {
    const submissions = this.getSubmissions();
    const submissionIndex = submissions.findIndex(sub => sub.id === submissionId);
    if (submissionIndex !== -1) {
      submissions[submissionIndex].evaluation = evaluation;
      submissions[submissionIndex].evaluated = true;
      localStorage.setItem(this.SUBMISSIONS_KEY, JSON.stringify(submissions));
    }
  }
}

export const dataService = new DataService();
