import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
import { authService } from '@/utils/auth';
import { dataService, QuestionPaper, StudentSubmission } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { FileText, CheckCircle, Clock } from 'lucide-react';
import API from '@/services/api';

const DashboardStudent = () => {
  const [user, setUser] = useState(authService.getAuthState().user);
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [openResultPaperId, setOpenResultPaperId] = useState<string | null>(null);

  useEffect(() => {
    const authState = authService.getAuthState();
    if (!authState.isAuthenticated || !authState.user) {
      navigate('/login');
      return;
    }
    setUser(authState.user);

    const token = authService.getToken();
    if (token && authState.user.id) {
      fetchStudentData(token, authState.user.id);
    }
  }, [navigate]);

  const fetchStudentData = async (token: string, studentId: number) => {
    try {
      const [allPapers, allSubmissions] = await Promise.all([
        dataService.getQuestionPapers(token),
        API.get('/submissions', { headers: { Authorization: `Bearer ${token}` } }).then(res => res.data)
      ]);
      setPapers(allPapers);
      const studentSubmissions = allSubmissions.filter(sub => sub.studentId === studentId);
      setSubmissions(studentSubmissions);
    } catch (error) {
      console.error("Failed to fetch student data", error);
    }
  };

  const handleLogout = () => {
    authService.logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate('/');
  };

  const hasSubmitted = (paperId: string) => {
    return submissions.some(sub => String(sub.questionPaperId) === String(paperId));
  };

  const getSubmissionStatus = (paperId: string) => {
    const submission = submissions.find(sub => sub.questionPaperId === paperId);
    if (!submission) return null;
    return submission.evaluated ? 'evaluated' : 'submitted';
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold gradient-text">ExamSpark</div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Welcome, {user.name}
            </span>
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

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Student Dashboard</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            View available question papers and track your submissions
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="edu-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Papers</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{papers.length}</div>
            </CardContent>
          </Card>

          <Card className="edu-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Submitted</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{submissions.length}</div>
            </CardContent>
          </Card>

          <Card className="edu-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Evaluated</CardTitle>
              <Clock className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {submissions.filter(sub => sub.evaluated).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Question Papers */}
        <Card className="edu-card">
          <CardHeader>
            <CardTitle>Available Question Papers</CardTitle>
            <CardDescription>
              Click on a paper to view and solve it
            </CardDescription>
          </CardHeader>
          <CardContent>
            {papers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No question papers available yet.
              </p>
            ) : (
              <div className="space-y-4">
                {papers.map((paper) => {
                  const status = getSubmissionStatus(paper.id);
                  const submission = submissions.find(sub => String(sub.questionPaperId) === String(paper.id));
                  return (
                    <div
                      key={paper.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div>
                        <h3 className="font-semibold">
                          {paper.subject} - Class {paper.class}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {paper.board} • {paper.difficulty} • {paper.totalMarks} marks
                        </p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(paper.createdAt).toLocaleDateString()}
                        </p>
                        {openResultPaperId === paper.id && submission && (
                          <div className="mt-2 p-2 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-900 dark:text-green-200 text-sm">
                            {submission.evaluated && submission.evaluation ? (
                              <>
                                <div><strong>Score:</strong> {submission.evaluation.percentage}%</div>
                                <div><strong>Grade:</strong> {submission.evaluation.grade}</div>
                                <div><strong>Feedback:</strong> {submission.evaluation.feedback}</div>
                                <div><strong>Score Breakdown:</strong> {typeof submission.evaluation.scoreBreakdown === 'object' && submission.evaluation.scoreBreakdown !== null
                                  ? Object.entries(submission.evaluation.scoreBreakdown).map(([k, v]) => `${k}: ${v}`).join(', ')
                                  : submission.evaluation.scoreBreakdown}</div>
                                <div className="text-xs text-gray-500">Evaluated on: {submission.evaluation.evaluatedAt && new Date(submission.evaluation.evaluatedAt).toLocaleString()}</div>
                              </>
                            ) : (
                              <div className="text-yellow-700 dark:text-yellow-300">Your answersheet has been submitted. Please wait for teacher evaluation.</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {status === 'evaluated' && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Evaluated
                          </span>
                        )}
                        {status === 'submitted' && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            Submitted
                          </span>
                        )}
                        {!hasSubmitted(paper.id) ? (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/solve-paper/${paper.id}`)}
                          >
                            Solve Paper
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            style={{ marginLeft: '24px', backgroundColor: '#dc2626', color: '#fff' }}
                            onClick={() => setOpenResultPaperId(openResultPaperId === paper.id ? null : paper.id)}
                        >
                            Marks
                        </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardStudent;
