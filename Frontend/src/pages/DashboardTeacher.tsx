import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
import { authService } from '@/utils/auth';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Users, BarChart3 } from 'lucide-react';
import { evaluateWithGemini } from '@/api/gemini';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
    fetchSubmissions();
    fetchRecentPapers();
    fetchAllPapers();
  }, [navigate]);

  const fetchSubmissions = async () => {
    const token = authService.getToken();
    const res = await fetch('http://localhost:5000/api/submissions', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const subs = res.ok ? await res.json() : [];
    setSubmissions(subs);
    loadStats(subs);
  };

  const loadStats = async (subsOverride) => {
    try {
      const token = authService.getToken();
      const res = await fetch('http://localhost:5000/api/papers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const papers = res.ok ? await res.json() : [];
      // Use the passed-in submissions or the state
      const currentSubs = subsOverride || submissions;
      const evaluatedSubmissions = currentSubs.filter(sub => sub.evaluated);

      // Calculate per-paper averages
      const paperAverages = papers
        .map(paper => {
          const paperSubs = currentSubs.filter(sub => String(sub.questionPaperId) === String(paper.id) && sub.evaluated);
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
        totalSubmissions: currentSubs.length,
        evaluatedSubmissions: evaluatedSubmissions.length,
        averageScore: overallAverageScore
      });
    } catch {
      setStats(s => ({ ...s, papersCreated: 0 }));
    }
  };

  const fetchRecentPapers = async () => {
    try {
      const token = authService.getToken();
      const res = await fetch('http://localhost:5000/api/papers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const papers = res.ok ? await res.json() : [];
      setRecentPapers(papers.slice(-3).reverse()); // Show latest 3 papers, most recent first
    } catch {
      setRecentPapers([]);
    }
  };

  const fetchAllPapers = async () => {
    try {
      const token = authService.getToken();
      const res = await fetch('http://localhost:5000/api/papers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const papers = res.ok ? await res.json() : [];
      setAllPapers(papers);
    } catch {
      setAllPapers([]);
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

  const handleDeletePaper = async (paperId: string) => {
    try {
      const token = authService.getToken();
      const res = await fetch(`http://localhost:5000/api/papers/${paperId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        let allSubs = dataService.getSubmissions();
        allSubs = allSubs.filter(sub => String(sub.questionPaperId) !== String(paperId));
        const papersRes = await fetch('http://localhost:5000/api/papers', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const papers = papersRes.ok ? await papersRes.json() : [];
        const validPaperIds = new Set(papers.map(p => String(p.id)));
        // Remove all orphaned submissions
        const filteredSubs = allSubs.filter(sub => validPaperIds.has(String(sub.questionPaperId)));
        if (papers.length === 0) {
          localStorage.removeItem('exam-spark-submissions');
          setSubmissions([]);
          setStats({
            papersCreated: 0,
            totalSubmissions: 0,
            evaluatedSubmissions: 0,
            averageScore: 0
          });
        } else {
          localStorage.setItem('exam-spark-submissions', JSON.stringify(filteredSubs));
          setSubmissions(filteredSubs);
          await loadStats(filteredSubs);
        }
        await fetchRecentPapers();
        await fetchAllPapers();
        toast({ title: 'Deleted', description: 'Question paper deleted.' });
        fetchSubmissions();
      } else {
        toast({ title: 'Delete Failed', description: 'Could not delete paper.', variant: 'destructive' });
      }
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Teacher Dashboard</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your question papers and track student performance
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
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
            <div className="space-y-4">
              {recentPapers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No question papers created yet. Click "Create Question Paper" to get started.
                </p>
              ) : (
                recentPapers.map((paper, index) => (
                  <div
                    key={paper.id || index}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <h3 className="font-semibold">{paper.subject} - Class {paper.class}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Created on {new Date(paper.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {paper.board} • {paper.difficulty} • {paper.totalMarks} marks
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <div className="font-semibold text-primary">
                        Available to students
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleDeletePaper(paper.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
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
                                          const evaluation = await evaluateWithGemini(paper, selectedSubmission.answers);
                                          const token = authService.getToken();
                                          const res = await fetch(`http://localhost:5000/api/submissions/${selectedSubmission.id}`, {
                                            method: 'PATCH',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              'Authorization': `Bearer ${token}`
                                            },
                                            body: JSON.stringify({ evaluation: { ...evaluation, evaluatedAt: new Date().toISOString() } })
                                          });
                                          setIsEvaluating(false);
                                          if (!res.ok) {
                                            const err = await res.json();
                                            toast({ title: "Evaluation Failed", description: err.error || "Failed to update evaluation.", variant: "destructive" });
                                            return;
                                          }
                                          toast({ title: "Evaluation Saved", description: "The answersheet has been evaluated." });
                                          fetchSubmissions();
                                          setSelectedSubmission(null);
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
