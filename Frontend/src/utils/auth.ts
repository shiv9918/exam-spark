export interface User {
  id: number;
  email: string;
  role: 'teacher' | 'student';
  name: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
}

const API_URL = 'http://localhost:5000'; // Adjust if deployed

class AuthService {
  getAuthState(): AuthState {
    const user = sessionStorage.getItem('exam-spark-user');
    const token = sessionStorage.getItem('exam-spark-token');
    if (user && token) {
      return {
        user: JSON.parse(user),
        isAuthenticated: true,
        token
      };
    }
    return { user: null, isAuthenticated: false, token: null };
  }

  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      sessionStorage.setItem('exam-spark-token', data.token);
      sessionStorage.setItem('exam-spark-user', JSON.stringify(data.user));

      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  }

  async signup(email: string, password: string, name: string, role: 'teacher' | 'student'): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role: role.toLowerCase() })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Signup failed' };
      }

      sessionStorage.setItem('exam-spark-token', data.token);
      sessionStorage.setItem('exam-spark-user', JSON.stringify(data.user));

      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  }

  logout() {
    sessionStorage.removeItem('exam-spark-token');
    sessionStorage.removeItem('exam-spark-user');
  }

  getToken() {
    return sessionStorage.getItem('exam-spark-token');
  }
}

export const authService = new AuthService();
