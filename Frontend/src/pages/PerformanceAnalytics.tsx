// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { authService } from '@/utils/auth';
import { dataService, QuestionPaper, StudentSubmission } from '@/services/dataService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import API from '@/services/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { getGreeting } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, ChartDataLabels);

interface PerformanceData {
  paperTitle: string;
  score: number;
  subject: string;
}

interface SubjectAvg {
  name: string;
  averageScore: number;
}

const PerformanceAnalytics = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const [submission, setSubmission] = useState<StudentSubmission | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<StudentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allSubjects, setAllSubjects] = useState<string[]>([]);

  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const greeting = getGreeting();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = authService.getToken();
      if (!token) {
        setError("You are not logged in.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Fetch all question papers to get all possible subjects
        const papers = await dataService.getQuestionPapers(token);
        const subjectsSet = new Set(papers.map(p => p.subject));
        setAllSubjects(Array.from(subjectsSet));
      } catch (err) {
        setAllSubjects([]);
      }
      if (submissionId) {
        // Detailed view for a single submission
        try {
          const data = await dataService.getSubmissionDetails(submissionId, token);
          if (data) {
            setSubmission(data);
          } else {
            setError("Failed to fetch submission details.");
          }
        } catch (err) {
          setError("An error occurred while fetching data.");
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load performance data.' });
        } finally {
          setLoading(false);
        }
      } else {
        // Subject-wise analytics for all submissions
        try {
          const submissions = await dataService.getAllSubmissions(token);
          setAllSubmissions(submissions.filter(s => s.evaluated && s.evaluation && s.paper && s.paper.subject));
        } catch (err) {
          setError("An error occurred while fetching analytics data.");
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load analytics data.' });
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [submissionId, toast]);

  const handleLogout = () => {
    authService.logout();
    toast({ title: "Logged out", description: "You have been successfully logged out" });
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6 gradient-text">{greeting}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full lg:col-span-2" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">{error}</h1>
      </div>
    );
  }

  // Subject-wise analytics view
  if (!submissionId) {
    // Use allSubjects for chart and cards
    const subjectScores: { [subject: string]: number[] } = {};
    allSubjects.forEach(subject => { subjectScores[subject] = []; });
    allSubmissions.forEach(sub => {
      const subject = sub.paper.subject;
      const score = typeof sub.evaluation?.percentage === 'number' && !isNaN(sub.evaluation.percentage) ? sub.evaluation.percentage : 0;
      if (!subjectScores[subject]) subjectScores[subject] = [];
      subjectScores[subject].push(score);
    });
    const subjects = allSubjects;
    const avgScores = subjects.map(subject => {
      const scores = subjectScores[subject].filter(s => typeof s === 'number' && !isNaN(s));
      return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    });
    const totalScores = subjects.map(subject => {
      const scores = subjectScores[subject].filter(s => typeof s === 'number' && !isNaN(s));
      return scores.length ? scores.reduce((a, b) => a + b, 0) : 0;
    });
    console.log('subjects:', subjects, 'avgScores:', avgScores, 'totalScores:', totalScores);
    // Calculate best and weakest subject
    const bestIdx = avgScores.length ? avgScores.indexOf(Math.max(...avgScores)) : -1;
    const weakIdx = avgScores.length ? avgScores.indexOf(Math.min(...avgScores)) : -1;
    // Calculate attempts per subject
    const attemptsPerSubject = subjects.map(subject => subjectScores[subject].length);
    // Prepare trend data (average score by submission date)
    const trendData = (() => {
      // Flatten all submissions with date and score
      const points = allSubmissions
        .filter(sub => typeof sub.evaluation?.percentage === 'number')
        .map(sub => ({
          date: sub.submittedAt.split('T')[0],
          score: sub.evaluation.percentage,
          subject: sub.paper.subject
        }));
      // Sort by date
      points.sort((a, b) => new Date(a.date) - new Date(b.date));
      return {
        labels: points.map(p => p.date),
        datasets: [
          {
            label: 'Score Over Time',
            data: points.map(p => p.score),
            fill: false,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.2,
          },
        ],
      };
    })();
    const trendOptions = {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Performance Trend (All Submissions)' },
      },
      scales: {
        x: { title: { display: true, text: 'Date' } },
        y: { title: { display: true, text: 'Score (%)' }, min: 0, max: 100 }
      }
    };
    // Performance badges
    const allAbove60 = avgScores.every(score => score >= 60 && score > 0);
    const improved = trendData.datasets[0].data.length > 1 && trendData.datasets[0].data[trendData.datasets[0].data.length-1] > trendData.datasets[0].data[0];
    // Feedback summary (last feedback per subject)
    const lastFeedbacks = subjects.map(subject => {
      const feedbacks = allSubmissions.filter(sub => sub.paper.subject === subject && sub.evaluation?.feedback).map(sub => sub.evaluation.feedback);
      return feedbacks.length ? feedbacks[feedbacks.length-1] : null;
    });
    // Horizontal Bar chart: average score per subject
    const barOptions = {
      indexAxis: 'y', // This makes it horizontal
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: theme === 'dark' ? '#fff' : '#000' }
        },
        title: {
          display: true,
          text: 'Subject-wise Performance',
          color: theme === 'dark' ? '#fff' : '#000',
          font: { size: 24 },
        },
      },
      scales: {
        x: { ticks: { color: theme === 'dark' ? '#fff' : '#000' }, beginAtZero: true },
        y: { ticks: { color: theme === 'dark' ? '#fff' : '#000' } }
      }
    };
    const barData = {
      labels: subjects,
      datasets: [
        {
          label: 'Average Score (%)',
          data: avgScores,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    };
    // Debug logs to verify chart data
    console.log('barData.labels:', barData.labels);
    console.log('barData.datasets[0].data:', barData.datasets[0].data);
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Navigation */}
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="text-2xl font-bold gradient-text">ExamSpark</div>
            <div className="flex items-center gap-4">
              {/* Optionally show user name if available */}
              {/* <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Welcome, {user?.name}</span> */}
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
        <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-3xl font-bold mb-2 gradient-text">Performance Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Here is your subject-wise performance based on all evaluated submissions.
          </p>
          {/* Responsive grid for badges and subject cards */}
          <div className="flex flex-wrap gap-4 mb-6">
            {bestIdx !== -1 && (
              <div className="bg-green-50 text-green-800 rounded-lg shadow p-4 flex-1 min-w-[180px] transition-transform duration-300 hover:scale-105">
                <div className="font-bold text-lg">Best Subject</div>
                <div className="text-xl">{subjects[bestIdx]}</div>
                <div className="text-2xl font-bold">{avgScores[bestIdx].toFixed(1)}%</div>
              </div>
            )}
            {weakIdx !== -1 && (
              <div className="bg-red-50 text-red-800 rounded-lg shadow p-4 flex-1 min-w-[180px] transition-transform duration-300 hover:scale-105">
                <div className="font-bold text-lg">Needs Improvement</div>
                <div className="text-xl">{subjects[weakIdx]}</div>
                <div className="text-2xl font-bold">{avgScores[weakIdx].toFixed(1)}%</div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
            {subjects.map((subject, idx) => (
              <div key={subject} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-start transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                <span className="text-lg font-semibold mb-1">{subject}</span>
                <span className={`text-3xl font-bold mb-2 ${avgScores[idx] === 0 ? 'text-gray-400' : 'text-primary'}`}>{avgScores[idx].toFixed(1)}%</span>
                <span className={`mb-2 px-2 py-1 rounded text-xs ${avgScores[idx] === 0 ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'}`}>{avgScores[idx] === 0 ? 'No attempts' : 'Evaluated'}</span>
                <span className="text-xs text-gray-500 mb-2">Attempts: {attemptsPerSubject[idx]}</span>
                {lastFeedbacks[idx] && (
                  <span className="text-xs italic text-blue-500 line-clamp-2 mb-1">
                    "{lastFeedbacks[idx]}"
                  </span>
                )}
              </div>
            ))}
          </div>
          {/* Animated Horizontal Bar Chart */}
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow p-6" style={{ minHeight: 320 }}>
            <Bar
              options={{
                ...barOptions,
                scales: {
                  ...barOptions.scales,
                  y: {
                    ...barOptions.scales.y,
                    ticks: {
                      ...barOptions.scales.y.ticks,
                      font: { size: 18 },
                    },
                  },
                  x: {
                    ...barOptions.scales.x,
                    ticks: {
                      ...barOptions.scales.x.ticks,
                      font: { size: 14 },
                    },
                  },
                },
              }}
              data={barData}
              height={320}
            />
          </div>
        </main>
        {/* Footer */}
        <footer className="bg-gradient-to-br from-indigo-100 via-white to-purple-100 dark:from-gray-800 dark:via-gray-900 dark:to-indigo-800 px-2 py-3 mt-4 flex flex-col justify-center min-h-[20vh] md:px-6 md:py-12 md:mt-20 md:min-h-[40vh]">
          {/* Compact footer for small screens */}
          <div className="container mx-auto flex flex-col gap-4 w-full text-xs md:hidden">
            <div className="mb-2">
              <h2 className="text-xl font-bold gradient-text mb-1">ExamSpark</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-8">
              <div>
                <h3 className="font-semibold mb-1 text-gray-800 dark:text-gray-100">Quick Links</h3>
                <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                  <li><a href="/login" className="hover:underline">Login</a></li>
                  <li><a href="/signup" className="hover:underline">Sign Up</a></li>
                  <li><a href="/" className="hover:underline">FAQ</a></li>
                  <li><a href="/" className="hover:underline">Contact Us</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-1 text-gray-800 dark:text-gray-100">Resources</h3>
                <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                  <li><a href="/" className="hover:underline">User Guides</a></li>
                  <li><a href="/" className="hover:underline">Help Center</a></li>
                  <li><a href="/" className="hover:underline">Blog</a></li>
                  <li><a href="/" className="hover:underline">Privacy Policy</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-2">
              <h3 className="font-semibold mb-1 text-gray-800 dark:text-gray-100">Follow Us</h3>
              <div className="flex gap-2 text-gray-600 dark:text-gray-300 text-lg">
                <a href="https://www.facebook.com" aria-label="Facebook" className="hover:text-blue-600">📘</a>
                <a href="https://www.twitter.com" aria-label="Twitter" className="hover:text-sky-500">🐦</a>
                <a href="www.linkedin.com/in/shiv9918" aria-label="LinkedIn" className="hover:text-blue-700">🔗</a>
                <a href="https://www.instagram.com" aria-label="Instagram" className="hover:text-pink-500">📸</a>
              </div>
            </div>
            <div className="mt-2 border-t pt-2 text-center text-[10px] text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} <strong>ExamSpark</strong>. All rights reserved.
            </div>
          </div>
          {/* Large footer for md+ screens */}
          <div className="container mx-auto hidden md:grid md:grid-cols-4 gap-12 w-full text-sm">
            {/* Brand & About Section */}
            <div>
              <h2 className="text-2xl font-bold gradient-text mb-2">ExamSpark</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Empowering teachers and students with AI-powered tools for smarter education.
              </p>
            </div>
            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Quick Links</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300 text-sm">
                <li><a href="/login" className="hover:underline">Login</a></li>
                <li><a href="/signup" className="hover:underline">Sign Up</a></li>
                <li><a href="/" className="hover:underline">FAQ</a></li>
                <li><a href="/" className="hover:underline">Contact Us</a></li>
              </ul>
            </div>
            {/* Resources */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Resources</h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300 text-sm">
                <li><a href="/" className="hover:underline">User Guides</a></li>
                <li><a href="/" className="hover:underline">Help Center</a></li>
                <li><a href="/" className="hover:underline">Blog</a></li>
                <li><a href="/" className="hover:underline">Privacy Policy</a></li>
              </ul>
            </div>
            {/* Follow Us */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Follow Us</h3>
              <div className="flex gap-4 text-gray-600 dark:text-gray-300 text-xl">
                <a href="https://www.facebook.com" aria-label="Facebook" className="hover:text-blue-600">📘</a>
                <a href="https://www.twitter.com" aria-label="Twitter" className="hover:text-sky-500">🐦</a>
                <a href="www.linkedin.com/in/shiv9918" aria-label="LinkedIn" className="hover:text-blue-700">🔗</a>
                <a href="https://www.instagram.com" aria-label="Instagram" className="hover:text-pink-500">📸</a>
              </div>
            </div>
            <div className="col-span-4 mt-8 border-t pt-4 text-center text-xs text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} <strong>ExamSpark</strong>. All rights reserved. | Revolutionizing learning through technology.
            </div>
          </div>
        </footer>
      </div>
    );
  }

  if (!submission || !submission.evaluation) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">{error || "No evaluation data available for this submission."}</h1>
      </div>
    );
  }
  
  const { evaluation, paper } = submission;
  const score = evaluation.percentage || 0;
  const scoreBreakdown = evaluation.scoreBreakdown || {};

  const barData = {
    labels: Object.keys(scoreBreakdown),
    datasets: [
      {
        label: 'Score per Section',
        data: Object.values(scoreBreakdown),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const doughnutData = {
    labels: ['Score', 'Remaining'],
    datasets: [
      {
        data: [score, 100 - score],
        backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)'],
        borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: theme === 'dark' ? '#fff' : '#000' }
      },
      title: {
        display: true,
        text: 'Chart.js Performance Analytics',
        color: theme === 'dark' ? '#fff' : '#000'
      },
    },
    scales: {
        y: { ticks: { color: theme === 'dark' ? '#fff' : '#000' } },
        x: { ticks: { color: theme === 'dark' ? '#fff' : '#000' } }
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold mb-2 gradient-text">Performance Analytics</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Detailed breakdown for your submission on <span className="font-semibold">{paper.subject} - Class {paper.class}</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold mb-2">{score}%</div>
            <Progress value={score} className="w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold">{evaluation.grade}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Teacher's Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{evaluation.feedback}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Score Breakdown by Section</CardTitle>
          </CardHeader>
          <CardContent className="h-96">
            <Bar options={chartOptions} data={barData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overall Percentage</CardTitle>
          </CardHeader>
          <CardContent className="h-96 flex items-center justify-center">
            <Doughnut options={{...chartOptions, plugins: {...chartOptions.plugins, legend: { display: false }}}} data={doughnutData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PerformanceAnalytics; 