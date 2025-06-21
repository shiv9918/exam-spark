import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/contexts/ThemeContext';
import { authService } from '@/utils/auth';
import { dataService, QuestionPaper, StudentSubmission } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import API from '@/services/api';

interface ParsedQuestion {
  number: string;
  text: string;
  marks?: string;
}

const SolvePaper = () => {
  const { paperId } = useParams<{ paperId: string }>();
  const [user, setUser] = useState(authService.getAuthState().user);
  const [paper, setPaper] = useState<QuestionPaper | null>(null);
  const [submission, setSubmission] = useState<StudentSubmission | null>(null);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [answers, setAnswers] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  useEffect(() => {
    const authState = authService.getAuthState();
    if (!authState.isAuthenticated || authState.user?.role !== 'student') {
      navigate('/login');
      return;
    }
    setUser(authState.user);
    loadPaper();
    // Prevent reopening if already submitted (check backend)
    const checkSubmission = async () => {
      const token = authService.getToken();
      try {
        const response = await API.get('/submissions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const allSubs = response.data;
        const userId = authState.user ? String(authState.user.id) : '';
        const existingSubmission = allSubs.find(
          sub => String(sub.studentId) === userId && String(sub.questionPaperId) === String(paperId)
        );
        if (existingSubmission) {
          toast({
            title: "Already Submitted",
            description: "You have already submitted this paper.",
            variant: "destructive",
          });
          navigate('/dashboard-student');
        }
      } catch (error) {
        console.error('Error checking submission:', error);
      }
    };
    checkSubmission();
  }, [navigate, paperId]);

  const parseQuestions = (content: string): ParsedQuestion[] => {
    const lines = content.split('\n').filter(line => line.trim());
    const parsedQuestions: ParsedQuestion[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for question patterns like "1.", "Q1:", "Question 1:", etc.
      const questionMatch = line.match(/^(?:Q(?:uestion)?\s*)?(\d+)[\.\:\)\s]/i);
      
      if (questionMatch) {
        const questionNumber = questionMatch[1];
        let questionText = line;
        
        // Check for marks indication in the same line or next line
        let marks = '';
        const marksMatch = line.match(/\[(\d+)\s*marks?\]/i) || line.match(/\((\d+)\s*marks?\)/i);
        if (marksMatch) {
          marks = marksMatch[1];
        }
        
        // If question text is too short, it might continue on next lines
        let j = i + 1;
        while (j < lines.length && !lines[j].trim().match(/^(?:Q(?:uestion)?\s*)?\d+[\.\:\)\s]/i)) {
          if (lines[j].trim()) {
            questionText += ' ' + lines[j].trim();
          }
          j++;
        }
        
        parsedQuestions.push({
          number: questionNumber,
          text: questionText,
          marks: marks
        });
        
        i = j - 1; // Skip the lines we've already processed
      }
    }
    
    // If no structured questions found, treat each non-empty line as a question
    if (parsedQuestions.length === 0) {
      lines.forEach((line, index) => {
        if (line.trim()) {
          parsedQuestions.push({
            number: (index + 1).toString(),
            text: line.trim()
          });
        }
      });
    }
    
    return parsedQuestions;
  };

  const loadPaper = () => {
    if (!paperId) return;
    const fetchPaper = async () => {
      try {
        const response = await API.get(`/papers/${paperId}`, {
          headers: { Authorization: `Bearer ${authService.getToken()}` }
        });
        const paper = response.data;
        setPaper(paper);
        // Parse questions and initialize answer fields
        const parsedQuestions = parseQuestions(paper.content);
        setQuestions(parsedQuestions);
        const initialAnswers: {[key: string]: string} = {};
        parsedQuestions.forEach(q => {
          initialAnswers[q.number] = '';
        });
        setAnswers(initialAnswers);
      } catch (error) {
        toast({
          title: "Paper not found",
          description: "The requested question paper could not be found",
          variant: "destructive",
        });
        navigate('/dashboard-student');
      }
    };
    fetchPaper();
  };

  const handleAnswerChange = (questionNumber: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionNumber]: value
    }));
  };

  const handleSubmit = async () => {
    const hasAnswers = Object.values(answers).some(answer => answer.trim());
    
    if (!hasAnswers) {
      toast({
        title: "Empty submission",
        description: "Please provide answers to at least one question before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionData = JSON.stringify(answers);
      const token = authService.getToken();
      const response = await API.post('/submissions', {
        question_paper_id: paperId,
        student_id: String(user!.id),
        student_name: user!.name,
        answers: submissionData
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      toast({
        title: "Submission successful!",
        description: "Your answers have been submitted successfully",
      });
      navigate('/dashboard-student', { replace: true });
    } catch (error: any) {
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit your answers. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  if (!user || !paper) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading question paper...</p>
        </div>
      </div>
    );
  }

  const userId = user ? String(user.id) : '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold gradient-text">ExamSpark</div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard-student')}
            >
              Dashboard
            </Button>
            <Button
              variant="ghost"
              onClick={toggleTheme}
              className="text-gray-600 dark:text-gray-300"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Solve Question Paper</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            {paper.subject} - Class {paper.class} • {paper.totalMarks} marks • {questions.length} questions
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {paper.board} • {paper.difficulty} Level • Created: {new Date(paper.createdAt).toLocaleDateString()}
          </p>
        </div>

        {submission && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200 font-medium">
              ✓ Submitted on {new Date(submission.submittedAt).toLocaleString()}
            </p>
            {submission.evaluation && (
              <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                Score: {submission.evaluation.percentage}% • Grade: {submission.evaluation.grade}
              </div>
            )}
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard-student')}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {questions.map((question, index) => (
            <Card key={question.number} className="edu-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Question {question.number}</span>
                  {question.marks && (
                    <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {question.marks} marks
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm leading-relaxed">{question.text}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Your Answer:
                  </label>
                  <Textarea
                    placeholder={`Write your answer for question ${question.number} here...`}
                    value={answers[question.number] || ''}
                    onChange={(e) => handleAnswerChange(question.number, e.target.value)}
                    rows={4}
                    disabled={!!submission}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {submission && submission.evaluation && (
          <Card className="mt-6 edu-card">
            <CardHeader>
              <CardTitle className="text-lg">Evaluation Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span>Score:</span>
                  <span className="font-bold text-lg">{submission.evaluation.percentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Grade:</span>
                  <span className="font-bold text-lg">{submission.evaluation.grade}</span>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Feedback:</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                  {submission.evaluation.feedback}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Score Breakdown:</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                  {submission.evaluation.scoreBreakdown}
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Evaluated on: {new Date(submission.evaluation.evaluatedAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        )}

        {!submission && (
          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !Object.values(answers).some(answer => answer.trim())}
              className="w-full max-w-md bg-primary hover:bg-primary/90"
              size="lg"
            >
              {isSubmitting ? "Submitting..." : "Submit All Answers"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SolvePaper;
