import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from '@/contexts/ThemeContext';
import { authService } from '@/utils/auth';
import { useToast } from '@/hooks/use-toast';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'teacher' | 'student',
    roll_no: '',
    class_name: ''
  });
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'teacher' || roleParam === 'student') {
      setFormData(prev => ({ ...prev, role: roleParam }));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Email validation
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Username validation
    if (!formData.name.trim() || formData.name.trim().length < 3) {
      toast({
        title: "Invalid Name",
        description: "Name must be at least 3 characters and not empty.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (formData.role === 'student') {
      if (!formData.roll_no.trim()) {
        toast({
          title: "Roll Number Required",
          description: "Please enter your roll number.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
      if (!formData.class_name.trim()) {
        toast({
          title: "Class Name Required",
          description: "Please enter your class name.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!profilePic) {
      toast({
        title: "Profile Picture Required",
        description: "Please select a profile picture to upload.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const result = await authService.signup(
        formData.email,
        formData.password,
        formData.name,
        formData.role,
        profilePic,
        formData.roll_no,
        formData.class_name
      );
      
      if (result.success && result.user) {
        toast({
          title: "Account created successfully!",
          description: `Welcome to ExamSpark, ${result.user.name}!`,
        });
        
        // Redirect based on role
        if (result.user.role === 'teacher') {
          navigate('/dashboard-teacher');
        } else {
          navigate('/dashboard-student');
        }
      } else {
        toast({
          title: "Signup failed",
          description: result.error || "Failed to create account",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePic(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen auth-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-between items-center mb-8">
            <Link to="/" className="text-2xl font-bold gradient-text">
              ExamSpark
            </Link>
            <Button
              variant="ghost"
              onClick={toggleTheme}
              className="text-gray-600 dark:text-gray-300"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </Button>
          </div>
          <h1 className="text-3xl font-bold gradient-text">Join ExamSpark</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Create your account and start your educational journey
          </p>
        </div>

        {/* Signup Form */}
        <Card className="edu-card">
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>
              Fill in your details to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2 text-center">
                <Label htmlFor="profile_pic">Profile Picture</Label>
                <div className="mt-2 flex justify-center">
                  {preview ? (
                    <img
                      src={preview}
                      alt=""
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full border-4 border-gray-200 dark:border-gray-700" />
                  )}
                </div>
                <Input
                  id="profile_pic"
                  type="file"
                  onChange={handleFileChange}
                  required
                  className="w-full mt-2"
                  accept="image/png, image/jpeg, image/gif"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.role === 'student' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="roll_no">Roll Number</Label>
                    <Input
                      id="roll_no"
                      type="text"
                      placeholder="Enter your roll number"
                      value={formData.roll_no}
                      onChange={(e) => handleInputChange('roll_no', e.target.value)}
                      required={formData.role === 'student'}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="class_name">Class Name</Label>
                    <Input
                      id="class_name"
                      type="text"
                      placeholder="Enter your class name (e.g., 9, 10, 12A)"
                      value={formData.class_name}
                      onChange={(e) => handleInputChange('class_name', e.target.value)}
                      required={formData.role === 'student'}
                      className="w-full"
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Already have an account?{' '}
                <Link 
                  to="/login" 
                  className="text-primary hover:underline font-medium"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
