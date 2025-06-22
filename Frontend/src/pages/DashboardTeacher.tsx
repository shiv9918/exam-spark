import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
import { authService } from '@/utils/auth';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Users, BarChart3 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import API, { SERVER_BASE_URL } from '@/services/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const DashboardTeacher = () => {
  const [user, setUser] = useState(authService.getAuthState().user);
  const [stats, setStats] = useState({
    papersCreated: 0,
    totalSubmissions: 0,
    evaluatedSubmissions: 0,
    averageScore: 0
  });
  const [recentPapers, setRecentPapers] = useState([]);
  const [allPapers, setAllPapers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [openEvalId, setOpenEvalId] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    const authState = authService.getAuthState();
    if (!authState.isAuthenticated || authState.user?.role !== 'teacher') {
      navigate('/login');
      return;
    }
    setUser(authState.user);

    const token = authService.getToken();
    if (token) {
      fetchDashboardData(token);
    }
  }, [navigate]);

  const fetchDashboardData = async (token: string) => {
    try {
      const [papers, submissions] = await Promise.all([
        dataService.getQuestionPapers(token),
        API.get('/submissions', { headers: { Authorization: `Bearer ${token}` } }).then(res => res.data)
      ]);

      setAllPapers(papers);
      setRecentPapers(papers.slice(-3).reverse());
      setSubmissions(submissions);
      loadStats(papers, submissions);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast({ title: 'Error', description: 'Could not load dashboard data.', variant: 'destructive' });
    }
  };

  const loadStats = (papers: any[], subs: any[]) => {
    const evaluatedSubmissions = subs.filter(sub => sub.evaluated);
    const paperAverages = papers
      .map(paper => {
        const paperSubs = subs.filter(sub => String(sub.questionPaperId) === String(paper.id) && sub.evaluated);
        if (paperSubs.length === 0) return null;
        const avg = paperSubs.reduce((sum, sub) => sum + (sub.evaluation?.percentage || 0), 0) / paperSubs.length;
        return avg;
      })
      .filter(avg => avg !== null);

    const overallAverageScore = paperAverages.length > 0
      ? Math.round(paperAverages.reduce((sum, avg) => sum + avg, 0) / paperAverages.length)
      : 0;

    setStats({
      papersCreated: papers.length,
      totalSubmissions: subs.length,
      evaluatedSubmissions: evaluatedSubmissions.length,
      averageScore: overallAverageScore,
    });
  };

  const handleLogout = () => {
    authService.logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate('/');
  };

  const handleDeletePaper = async (paperId: string) => {
    try {
      const token = authService.getToken();
      if (!token) return;
      await API.delete(`/papers/${paperId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refetch all data to update the UI
      fetchDashboardData(token);
      toast({ title: 'Deleted', description: 'Question paper and its submissions deleted.' });
    } catch {
      toast({ title: 'Delete Failed', description: 'Could not delete paper.', variant: 'destructive' });
    }
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
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
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
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          {/* Left Column: Title, Name, and Actions */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-3xl font-bold">
                <span className="gradient-text">Teacher Dashboard</span>
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Manage your question papers and track student performance
              </p>
            </div>
            <h2 className="text-2xl lg:text-4xl font-semibold text-gray-800 dark:text-gray-100">
              {user.name}
            </h2>
            <div className="mt-2">
                <Button
                  onClick={() => navigate('/generate-paper')}
                  className="bg-primary hover:bg-primary/90 flex items-center gap-2"
                  size="lg"
                >
                  <Plus className="h-5 w-5" />
                  Create Question Paper
                </Button>
            </div>
          </div>

          {/* Right Column: Profile Picture */}
          <div className="flex flex-col items-center">
            <Avatar className="h-32 w-32 lg:h-40 lg:w-40 border-4 border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out hover:scale-110 hover:-rotate-6 shadow-lg hover:shadow-2xl">
              <AvatarImage src={user?.profile_pic_url ? `${SERVER_BASE_URL}/${user.profile_pic_url}` : undefined} alt={user?.name} className="object-cover" />
              <AvatarFallback className="text-4xl lg:text-6xl">{user?.name?.[0]}</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="edu-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Question Papers Created
              </CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.papersCreated}</div>
              <p className="text-xs text-muted-foreground">
                Total created
              </p>
            </CardContent>
          </Card>

          <Card className="edu-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Student Submissions
              </CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
              <p className="text-xs text-muted-foreground">
                Total submissions
              </p>
            </CardContent>
          </Card>

          <Card className="edu-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Evaluated Papers
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.evaluatedSubmissions}</div>
              <p className="text-xs text-muted-foreground">
                Out of {stats.totalSubmissions}
              </p>
            </CardContent>
          </Card>

          <Card className="edu-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Score
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageScore}%</div>
              <p className="text-xs text-muted-foreground">
                Class performance
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Papers */}
        <Card className="edu-card">
          <CardHeader>
            <CardTitle>Recent Question Papers</CardTitle>
            <CardDescription>
              Your recently created question papers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentPapers.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-4">
                {recentPapers.map((paper: any) => (
                  <Card key={paper.id} className="edu-card overflow-hidden">
                    <CardHeader>
                      <CardTitle className="truncate">{paper.title}</CardTitle>
                      <CardDescription>Class: {paper.class_name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        Created on {new Date(paper.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {paper.board} • {paper.difficulty} • {paper.totalMarks} marks
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <div className="font-semibold text-primary">
                          Available to students
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleDeletePaper(paper.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No question papers created yet. Click "Create Question Paper" to get started.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Student Submissions Grouped by Paper */}
        <Card className="edu-card mt-8">
          <CardHeader>
            <CardTitle>Student Submissions (by Paper)</CardTitle>
            <CardDescription>
              Evaluate student answersheets grouped by question paper
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {allPapers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No question papers found.
                </p>
              ) : (
                allPapers.map((paper) => {
                  const paperSubs = submissions.filter(sub => String(sub.questionPaperId) === String(paper.id));
                  if (paperSubs.length === 0) return null;

                  // Stats for this paper
                  const totalSubs = paperSubs.length;
                  const evaluatedSubs = paperSubs.filter(sub => sub.evaluated);
                  const pendingSubs = paperSubs.filter(sub => !sub.evaluated);
                  const avgScore = evaluatedSubs.length > 0
                    ? Math.round(evaluatedSubs.reduce((sum, sub) => sum + (sub.evaluation?.percentage || 0), 0) / evaluatedSubs.length)
                    : 0;

                  return (
                    <div key={paper.id} className="mb-8">
                      <div className="font-bold text-lg mb-2">{paper.subject} - Class {paper.class} ({paper.board}, {paper.difficulty}, {paper.totalMarks} marks)</div>
                      {/* Stats for this paper */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <Card className="edu-card">
                          <CardHeader className="pb-2"><CardTitle className="text-xs">Total Submissions</CardTitle></CardHeader>
                          <CardContent><div className="text-lg font-bold">{totalSubs}</div></CardContent>
                        </Card>
                        <Card className="edu-card">
                          <CardHeader className="pb-2"><CardTitle className="text-xs">Review Pending</CardTitle></CardHeader>
                          <CardContent><div className="text-lg font-bold">{pendingSubs.length}</div></CardContent>
                        </Card>
                        <Card className="edu-card">
                          <CardHeader className="pb-2"><CardTitle className="text-xs">Evaluated</CardTitle></CardHeader>
                          <CardContent><div className="text-lg font-bold">{evaluatedSubs.length}</div></CardContent>
                        </Card>
                        <Card className="edu-card">
                          <CardHeader className="pb-2"><CardTitle className="text-xs">Average Score</CardTitle></CardHeader>
                          <CardContent><div className="text-lg font-bold">{avgScore}%</div></CardContent>
                        </Card>
                      </div>
                      <div className="space-y-4">
                        {paperSubs.map((sub) => (
                          <div key={sub.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2 flex items-center justify-between">
                            <div>
                              <div className="mb-2 font-semibold">Student: {sub.studentName}</div>
                              <div className="text-xs text-gray-500 mb-1">Submitted: {new Date(sub.submittedAt).toLocaleString()}</div>
                              <div className="text-xs text-gray-500 mb-1">Status: {sub.evaluated ? 'Evaluated' : 'Pending Review'}</div>
                            </div>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" onClick={() => setSelectedSubmission(sub)}>
                                  Review & Evaluate
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Submission Details</DialogTitle>
                                  <DialogDescription>
                                    Review the student's answers and evaluation details
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedSubmission && selectedSubmission.id === sub.id && (
                                  <div className="space-y-6">
                                    <div>
                                      <h3 className="font-medium mb-2">Student: {selectedSubmission.studentName}</h3>
                                      <p className="text-sm text-gray-600">Paper: {paper.subject} - Class {paper.class}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-medium mb-2">Student's Answers:</h4>
                                      <div className="bg-gray-50 dark:bg-gray-700 rounded p-4 max-h-40 overflow-y-auto">
                                        <pre className="text-sm whitespace-pre-wrap">{selectedSubmission.answers}</pre>
                                      </div>
                                    </div>
                                    {selectedSubmission.evaluated && selectedSubmission.evaluation ? (
                                      <div className="space-y-4">
                                        <div className="font-bold text-lg">Score: {selectedSubmission.evaluation.percentage}% ({selectedSubmission.evaluation.grade})</div>
                                        <div><strong>Feedback:</strong> {selectedSubmission.evaluation.feedback}</div>
                                        <div><strong>Score Breakdown:</strong> {typeof selectedSubmission.evaluation.scoreBreakdown === 'object' && selectedSubmission.evaluation.scoreBreakdown !== null
                                          ? Object.entries(selectedSubmission.evaluation.scoreBreakdown).map(([k, v]) => `${k}: ${v}`).join(', ')
                                          : selectedSubmission.evaluation.scoreBreakdown}</div>
                                        <div className="text-xs text-gray-500">Evaluated on: {selectedSubmission.evaluation.evaluatedAt && new Date(selectedSubmission.evaluation.evaluatedAt).toLocaleString()}</div>
                                      </div>
                                    ) : (
                                      <Button
                                        onClick={async () => {
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
                                              studentAnswer: selectedSubmission.answers,
                                              maxMarks: paper.totalMarks || 100
                                            }, {
                                              headers: { Authorization: `Bearer ${token}` }
                                            });

                                            const evaluation = evaluationResponse.data;

                                            // Update the submission with the evaluation
                                            const updateResponse = await API.patch(`/submissions/${selectedSubmission.id}`, {
                                              evaluation: { ...evaluation, evaluatedAt: new Date().toISOString() }
                                            }, {
                                              headers: { Authorization: `Bearer ${token}` }
                                            });

                                            toast({ title: "Evaluation Saved", description: "The answersheet has been evaluated." });
                                            fetchDashboardData(token);
                                            setSelectedSubmission(null);
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
                                            
                                            toast({ title: "Evaluation Failed", description: "Failed to evaluate submission. Please try again.", variant: "destructive" });
                                          } finally {
                                            setIsEvaluating(false);
                                          }
                                        }}
                                        disabled={isEvaluating}
                                        className="w-full"
                                      >
                                        {isEvaluating ? "Evaluating with AI..." : "Evaluate with AI"}
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardTeacher;
