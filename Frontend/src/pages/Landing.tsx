
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts/ThemeContext';
import { ArrowDown, Check, Plus } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const features = [
    {
      title: "AI-Powered Question Generation",
      description: "Generate customized question papers instantly using advanced AI technology",
      icon: "🤖"
    },
    {
      title: "Automated Evaluation",
      description: "Get detailed feedback and grades for student submissions automatically",
      icon: "📊"
    },
    {
      title: "Multi-Board Support",
      description: "Support for CBSE, ICSE, State Boards, and NCERT curricula",
      icon: "📚"
    },
    {
      title: "Real-time Collaboration",
      description: "Teachers and students can interact seamlessly through the platform",
      icon: "🤝"
    }
  ];

  const testimonials = [
    {
      name: "Priya Sharma",
      role: "Mathematics Teacher",
      content: "ExamSpark has revolutionized how I create question papers. What used to take hours now takes minutes!",
      rating: 5
    },
    {
      name: "Rahul Verma",
      role: "Science Teacher",
      content: "The AI evaluation is incredibly accurate and provides detailed feedback that helps my students improve.",
      rating: 5
    },
    {
      name: "Ananya Patel",
      role: "Student, Class 10",
      content: "I love getting instant feedback on my answers. It's like having a personal tutor available 24/7.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold gradient-text">ExamSpark</div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={toggleTheme}
            className="text-gray-600 dark:text-gray-300"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/login')}
            className="border-primary text-primary hover:bg-primary hover:text-white"
          >
            Login
          </Button>
          <Button
            onClick={() => navigate('/signup')}
            className="bg-primary hover:bg-primary/90"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="gradient-text">AI-Powered</span>
            <br />
            Question Papers &
            <br />
            <span className="gradient-text">Smart Evaluation</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Transform education with intelligent question paper generation and automated evaluation. 
            Perfect for teachers and students across all boards and subjects.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={() => navigate('/signup?role=teacher')}
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-6"
            >
              <Plus className="mr-2 h-5 w-5" />
              Start as Teacher
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/signup?role=student')}
              className="border-primary text-primary hover:bg-primary hover:text-white text-lg px-8 py-6"
            >
              Join as Student
            </Button>
          </div>
        </div>
        
        <div className="mt-16 animate-bounce">
          <ArrowDown className="mx-auto h-8 w-8 text-gray-400" />
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            <span className="gradient-text">Powerful Features</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Everything you need for modern educational assessment
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="edu-card text-center group">
              <CardHeader>
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container mx-auto px-4 py-20 bg-white/50 dark:bg-gray-800/50 rounded-3xl my-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            <span className="gradient-text">What Our Users Say</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Trusted by thousands of educators and students
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="edu-card">
              <CardHeader>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400">⭐</span>
                  ))}
                </div>
                <CardDescription className="text-gray-600 dark:text-gray-300 italic">
                  "{testimonial.content}"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-gray-500">{testimonial.role}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-4xl font-bold">
            Ready to <span className="gradient-text">Transform</span> Your Teaching?
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Join thousands of educators who are already using ExamSpark to create better assessments
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={() => navigate('/signup')}
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-6"
            >
              Get Started Free
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-primary hover:bg-primary/10 text-lg px-8 py-6"
            >
              Watch Demo
            </Button>
          </div>
        </div>
      </section>
<footer className="bg-gradient-to-br from-indigo-100 via-white to-purple-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 px-6 py-12 mt-20">
  <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
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
  </div>

  {/* Bottom Bar */}
  <div className="mt-12 border-t pt-6 text-center text-sm text-gray-500 dark:text-gray-400">
    © 2025 <strong>ExamSpark</strong>. All rights reserved. | Revolutionizing learning through technology.
  </div>
</footer>


    </div>
  );
};

export default Landing;
