import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useTheme } from '@/contexts/ThemeContext';
import { authService } from '@/utils/auth';
import { generateQuestionPaper, QuestionPaperParams } from '@/api/gemini';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { ArrowDown } from 'lucide-react';

const GeneratePaper = () => {
  const [user, setUser] = useState(authService.getAuthState().user);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPaper, setGeneratedPaper] = useState<string | null>(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const [formData, setFormData] = useState<QuestionPaperParams>({
    subject: '',
    class: '',
    totalMarks: 100,
    difficulty: '',
    board: '',
    chapters: [],
    specificTopic: '',
    instructions: '',
    paperPattern: ''
  });

  const subjects = [
    'Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology',
    'English', 'Hindi', 'History', 'Geography', 'Economics',
    'Political Science', 'Computer Science'
  ];

  const classes = ['6', '7', '8', '9', '10', '11', '12'];
  const totalMarksOptions = [20, 40, 60, 75, 80, 85, 100];
  const difficulties = ['Easy', 'Medium', 'Hard'];
  const boards = ['CBSE', 'ICSE', 'State Board', 'NCERT'];
  const paperPatterns = ['Board Pattern', 'MCQ', 'Mixed', 'Descriptive', 'Objective'];

  const chaptersBySubject = {
    'Mathematics': ['Algebra', 'Geometry', 'Trigonometry', 'Statistics', 'Probability'],
    'Physics': ['Mechanics', 'Thermodynamics', 'Optics', 'Electricity', 'Magnetism'],
    'Chemistry': ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry'],
    'Biology': ['Cell Biology', 'Genetics', 'Evolution', 'Ecology', 'Human Physiology'],
    'English': ['Grammar', 'Literature', 'Writing Skills', 'Reading Comprehension'],
    'Science': ['Physics', 'Chemistry', 'Biology', 'Environmental Science'],
    'Hindi': ['Vyakaran', 'Sahitya', 'Patra Lekhan', 'Nibandh', 'Kavita'],
    'History': ['Ancient History', 'Medieval History', 'Modern History', 'World History', 'Indian Freedom Struggle'],
    'Geography': ['Physical Geography', 'Human Geography', 'Maps', 'Environment', 'Resources'],
    'Economics': ['Microeconomics', 'Macroeconomics', 'Indian Economy', 'Development', 'Statistics'],
    'Political Science': ['Indian Constitution', 'Political Theory', 'Comparative Politics', 'International Relations', 'Public Administration'],
    'Computer Science': ['Programming', 'Data Structures', 'Algorithms', 'Databases', 'Networking']
  };

  useEffect(() => {
    const authState = authService.getAuthState();
    console.log('Auth state on load:', authState);
    if (!authState.isAuthenticated || authState.user?.role !== 'teacher') {
      navigate('/login');
      return;
    }
    setUser(authState.user);
  }, [navigate]);

  const handleInputChange = (field: keyof QuestionPaperParams, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleChapterToggle = (chapter: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      chapters: checked
        ? [...prev.chapters, chapter]
        : prev.chapters.filter(c => c !== chapter)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!formData.subject || !formData.class || !formData.difficulty || !formData.board || !formData.paperPattern) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (formData.chapters.length === 0) {
        toast({
          title: "Select Chapters",
          description: "Please select at least one chapter",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const token = authService.getAuthState().token;
      console.log('Token before API call:', token ? `${token.substring(0, 20)}...` : 'No token');
      if (!token) {
        toast({
          title: "Not Authenticated",
          description: "Please log in again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const paper = await generateQuestionPaper(formData, token);
      setGeneratedPaper(paper);
      
      toast({
        title: "Question Paper Generated!",
        description: "Your question paper has been created successfully",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate question paper. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePaper = () => {
    if (!generatedPaper || !user) return;

    const token = authService.getAuthState().token;
    if (!token) {
      toast({
        title: "Not Authenticated",
        description: "Please log in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        subject: formData.subject,
        class_name: formData.class,
        total_marks: formData.totalMarks,
        difficulty: formData.difficulty,
        board: formData.board,
        content: generatedPaper,
        chapters: formData.chapters
      };
      console.log('Payload sent to backend:', payload);
      dataService.saveQuestionPaper(payload, token);

      toast({
        title: "Paper Saved!",
        description: "Question paper has been saved and is now available to students",
      });

      // Reset form
      setGeneratedPaper(null);
      setFormData({
        subject: '',
        class: '',
        totalMarks: 100,
        difficulty: '',
        board: '',
        chapters: [],
        specificTopic: '',
        instructions: '',
        paperPattern: ''
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save question paper. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/');
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
            <span className="gradient-text">Generate Question Paper</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Create AI-powered question papers customized to your requirements
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <Card className="edu-card-no-hover">
            <CardHeader>
              <CardTitle>Paper Configuration</CardTitle>
              <CardDescription>
                Fill in the details to generate your customized question paper
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Select value={formData.subject} onValueChange={(value) => handleInputChange('subject', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map(subject => (
                          <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="class">Class *</Label>
                    <Select value={formData.class} onValueChange={(value) => handleInputChange('class', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(cls => (
                          <SelectItem key={cls} value={cls}>{cls}th</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalMarks">Total Marks</Label>
                    <Select value={formData.totalMarks.toString()} onValueChange={(value) => handleInputChange('totalMarks', parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {totalMarksOptions.map(marks => (
                          <SelectItem key={marks} value={marks.toString()}>{marks}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty Level *</Label>
                    <Select value={formData.difficulty} onValueChange={(value) => handleInputChange('difficulty', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        {difficulties.map(difficulty => (
                          <SelectItem key={difficulty} value={difficulty}>{difficulty}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="board">Board *</Label>
                    <Select value={formData.board} onValueChange={(value) => handleInputChange('board', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select board" />
                      </SelectTrigger>
                      <SelectContent>
                        {boards.map(board => (
                          <SelectItem key={board} value={board}>{board}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paperPattern">Paper Pattern *</Label>
                    <Select value={formData.paperPattern} onValueChange={(value) => handleInputChange('paperPattern', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pattern" />
                      </SelectTrigger>
                      <SelectContent>
                        {paperPatterns.map(pattern => (
                          <SelectItem key={pattern} value={pattern}>{pattern}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.subject && (
                  <div className="space-y-2">
                    <Label>Chapters *</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-3 border rounded-md">
                      {(chaptersBySubject[formData.subject as keyof typeof chaptersBySubject] || []).map(chapter => (
                        <div key={chapter} className="flex items-center space-x-2">
                          <Checkbox
                            id={chapter}
                            checked={formData.chapters.includes(chapter)}
                            onCheckedChange={(checked) => handleChapterToggle(chapter, checked as boolean)}
                          />
                          <Label htmlFor={chapter} className="text-sm">{chapter}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="specificTopic">Specific Topic (Optional)</Label>
                  <Input
                    id="specificTopic"
                    placeholder="e.g., Quadratic Equations"
                    value={formData.specificTopic}
                    onChange={(e) => handleInputChange('specificTopic', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Special Instructions (Optional)</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Any special instructions for the question paper..."
                    value={formData.instructions}
                    onChange={(e) => handleInputChange('instructions', e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary"
                  disabled={isLoading}
                >
                  {isLoading ? "Generating..." : "Generate Question Paper"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Generated Paper Section */}
          <Card className="edu-card-no-hover">
            <CardHeader>
              <CardTitle>Generated Question Paper</CardTitle>
              <CardDescription>
                Your AI-generated question paper will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Generating your question paper...</p>
                  </div>
                </div>
              ) : generatedPaper ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-mono">{generatedPaper}</pre>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSavePaper}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Save for Students
                    </Button>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPaper);
                        toast({
                          title: "Copied!",
                          description: "Question paper copied to clipboard",
                        });
                      }}
                      variant="outline"
                    >
                      Copy to Clipboard
                    </Button>
                    <Button
                      onClick={() => {
                        const blob = new Blob([generatedPaper], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `question-paper-${formData.subject}-${formData.class}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      variant="outline"
                    >
                      Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-center">
                  <div>
                    <ArrowDown className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Fill out the form and click "Generate Question Paper" to create your customized paper
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GeneratePaper;
