import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTheme } from '@/contexts/ThemeContext';
import { authService } from '@/utils/auth';
import { dataService, StudentSubmission, QuestionPaper } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { FileText, User, Clock, CheckCircle } from 'lucide-react';
import API from '@/services/api';

function parseQuestions(text) {
  const questionRegex = /(\d+\.\s.*?)(?=\d+\.|$)/gs;
  const matches = text.match(questionRegex) || [];
  return matches.map(q => {
    const [questionPart, ...optionParts] = q.split(/(?=[a-dA-D]\))/g);
    const question = questionPart.trim();
    const optionsRaw = optionParts.join(' ').replace(/\s+/g, ' ');
    const options = optionsRaw
      ? optionsRaw.split(/(?=[A-Da-d]\))/g).map(opt => opt.trim()).filter(Boolean)
      : [];
    return { question, options };
  });
}

const ViewSubmissions = () => {
  const [user, setUser] = useState(authService.getAuthState().user);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<StudentSubmission | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  useEffect(() => {
    const authState = authService.getAuthState();
    if (!authState.isAuthenticated || authState.user?.role !== 'teacher') {
      navigate('/login');
      return;
    }
    setUser(authState.user);
    loadData();
    fetchPapers();
  }, [navigate]);

  const fetchPapers = async () => {
    const token = authService.getToken();
    try {
      const response = await API.get('/papers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPapers(response.data);
    } catch (error) {
      console.error('Failed to fetch papers:', error);
      setPapers([]);
    }
  };

  const loadData = async () => {
    const token = authService.getToken();
    try {
      const response = await API.get('/submissions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allSubmissions = response.data;
      const validPaperIds = new Set(papers.map(p => String(p.id)));
      const filteredSubmissions = allSubmissions.filter(sub => validPaperIds.has(String(sub.questionPaperId)));
      setSubmissions(filteredSubmissions);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
      setSubmissions([]);
    }
  };

  const getPaperTitle = (paperId: string) => {
    const paper = papers.find(p => p.id === paperId);
    return paper ? `${paper.subject} - Class ${paper.class}` : 'Unknown Paper';
  };

  const getPaper = (paperId: string) => {
    return papers.find(p => p.id === paperId);
  };

  const handleEvaluate = async (submission: StudentSubmission) => {
    const paper = getPaper(submission.questionPaperId);
    if (!paper) {
      toast({
        title: "Error",
        description: "Could not find the associated question paper",
        variant: "destructive",
      });
      return;
    }

    setIsEvaluating(true);
    try {
      const token = authService.getToken();
      if (!token) {
        toast({ title: "Not Authenticated", description: "Please log in again.", variant: "destructive" });
        return;
      }

      // Call the backend evaluation endpoint
      const evaluationResponse = await API.post('/evaluate-submission', {
        question: paper.content,
        studentAnswer: submission.answers,
        maxMarks: paper.totalMarks || 100
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const evaluation = evaluationResponse.data;

      // Update the submission with the evaluation
      const res = await API.patch(`/submissions/${submission.id}`,
        { evaluation: { ...evaluation, evaluatedAt: new Date().toISOString() } },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 200) {
        setSubmissions(prev =>
          prev.map(s => (s.id === submission.id ? { ...s, evaluated: true, evaluation: res.data.evaluation } : s))
        );
        toast({ title: "Success", description: "Evaluation complete and saved." });
      } else {
        toast({ title: "Error", description: "Failed to save evaluation.", variant: 'destructive' });
      }
    } catch (error) {
      console.error('Evaluation error:', error);
      
      // Check if token has expired
      if (error.response?.status === 401 && error.response?.data?.msg === 'Token has expired') {
        // Clear the expired token and redirect to login
        sessionStorage.removeItem('exam-spark-token');
        sessionStorage.removeItem('exam-spark-user');
        window.location.href = '/login';
        toast({ title: "Session Expired", description: "Your session has expired. Please log in again.", variant: "destructive" });
        return;
      }
      
      // Check for rate limiting
      if (error.response?.status === 429) {
        toast({ title: "Rate Limit Exceeded", description: "Please wait a moment and try again.", variant: "destructive" });
        return;
      }
      
      toast({ title: "Error", description: "An unexpected error occurred during evaluation.", variant: 'destructive' });
    } finally {
      setIsEvaluating(false);
      setSelectedSubmission(null);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const unevaluatedSubmissions = submissions.filter(sub => !sub.evaluated);
  const evaluatedSubmissions = submissions.filter(sub => sub.evaluated);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold gradient-text">ExamSpark</div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard-teacher')}
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
            <span className="gradient-text">Student Submissions</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Review and evaluate student submissions
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="edu-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{submissions.length}</div>
            </CardContent>
          </Card>

          <Card className="edu-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unevaluatedSubmissions.length}</div>
            </CardContent>
          </Card>

          <Card className="edu-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Evaluated</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{evaluatedSubmissions.length}</div>
            </CardContent>
          </Card>

          <Card className="edu-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Score</CardTitle>
              <User className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {evaluatedSubmissions.length > 0
                  ? Math.round(
                      evaluatedSubmissions.reduce((sum, sub) => sum + (sub.evaluation?.percentage || 0), 0) /
                      evaluatedSubmissions.length
                    )
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Submissions */}
        {unevaluatedSubmissions.length > 0 && (
          <Card className="edu-card mb-8">
            <CardHeader>
              <CardTitle>Pending Evaluations</CardTitle>
              <CardDescription>
                Submissions waiting for evaluation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {unevaluatedSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold">{submission.studentName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {getPaperTitle(submission.questionPaperId)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Submitted: {new Date(submission.submittedAt).toLocaleString()}
                      </p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => setSelectedSubmission(submission)}
                        >
                          Review & Evaluate
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Evaluate Submission</DialogTitle>
                          <DialogDescription>
                            Review the student's answers and evaluate using AI
                          </DialogDescription>
                        </DialogHeader>
                        {selectedSubmission && (
                          <div className="space-y-6">
                            <div>
                              <h3 className="font-medium mb-2">Student: {selectedSubmission.studentName}</h3>
                              <p className="text-sm text-gray-600">
                                Paper: {getPaperTitle(selectedSubmission.questionPaperId)}
                              </p>
                            </div>
                            
                            <div>
                              <h4 className="font-medium mb-2">Question Paper:</h4>
                              <div className="bg-gray-50 dark:bg-gray-700 rounded p-4 max-h-40 overflow-y-auto">
                                <pre className="text-sm whitespace-pre-wrap">
                                  {getPaper(selectedSubmission.questionPaperId)?.content || 'Paper not found'}
                                </pre>
                              </div>
                            </div>

                            <div>
                              <h4 className="font-medium mb-2">Student's Answers:</h4>
                              <div className="bg-gray-50 dark:bg-gray-700 rounded p-4 max-h-40 overflow-y-auto">
                                <pre className="text-sm whitespace-pre-wrap">
                                  {selectedSubmission.answers}
                                </pre>
                              </div>
                            </div>

                            <Button
                              onClick={() => handleEvaluate(selectedSubmission)}
                              disabled={isEvaluating}
                              className="w-full"
                            >
                              {isEvaluating ? "Evaluating with AI..." : "Evaluate with AI"}
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evaluated Submissions */}
        <Card className="edu-card">
          <CardHeader>
            <CardTitle>Evaluated Submissions</CardTitle>
            <CardDescription>
              Previously evaluated submissions and results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {evaluatedSubmissions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No evaluated submissions yet.
              </p>
            ) : (
              <div className="space-y-4">
                {evaluatedSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold">{submission.studentName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {getPaperTitle(submission.questionPaperId)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Evaluated: {submission.evaluation?.evaluatedAt ? 
                          new Date(submission.evaluation.evaluatedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {submission.evaluation?.percentage}% ({submission.evaluation?.grade})
                      </div>
                      <Dialog>
                        
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Evaluation Details</DialogTitle>
                          </DialogHeader>
                          {selectedSubmission?.evaluation && (
                            <div className="space-y-4">
                              <div className="flex justify-between text-lg">
                                <span>Score:</span>
                                <span className="font-bold">
                                  {selectedSubmission.evaluation.percentage}% ({selectedSubmission.evaluation.grade})
                                </span>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Feedback:</h4>
                                <p className="text-sm bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                  {selectedSubmission.evaluation.feedback}
                                </p>
                              </div>
                              {/* Score Breakdown Pretty View */}
                              {selectedSubmission && selectedSubmission.evaluation && (() => {
                                const paper = getPaper(selectedSubmission.questionPaperId);
                                if (!paper) return null;
                                const parsedQuestions = parseQuestions(paper.content || '');
                                let studentAnswers = {};
                                try {
                                  if (typeof selectedSubmission.answers === 'string') {
                                    studentAnswers = JSON.parse(selectedSubmission.answers);
                                  } else {
                                    studentAnswers = selectedSubmission.answers;
                                  }
                                } catch {
                                  studentAnswers = selectedSubmission.answers || {};
                                }
                                const scoreBreakdown = selectedSubmission.evaluation.scoreBreakdown || {};
                                return (
                                  <div className="mb-6">
                                    <h4 className="font-medium mb-2">Score Breakdown:</h4>
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-4 max-h-60 overflow-y-auto text-sm font-mono whitespace-pre-wrap">
                                      {parsedQuestions.map((q, idx) => (
                                        <div key={idx} className="mb-4">
                                          <div><strong>Q{idx + 1}:</strong> {q.question}</div>
                                          {q.options.map((opt, oidx) => (
                                            <div key={oidx} style={{ marginLeft: 16 }}>{opt}</div>
                                          ))}
                                          <div style={{ marginLeft: 16 }}>
                                            <span><strong>Student's Answer:</strong> {studentAnswers[idx + 1] || '-'}</span>
                                          </div>
                                          <div style={{ marginLeft: 16 }}>
                                            <span><strong>Score:</strong> {scoreBreakdown[idx + 1] ?? scoreBreakdown[`Question ${idx + 1}`] ?? 0}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ViewSubmissions;
