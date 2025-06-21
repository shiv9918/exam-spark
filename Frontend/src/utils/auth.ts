import API from '../services/api';

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
      const res = await API.post('/auth/login', { email, password });
      const data = res.data;

      sessionStorage.setItem('exam-spark-token', data.token);
      sessionStorage.setItem('exam-spark-user', JSON.stringify(data.user));

      return { success: true, user: data.user };
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Network error';
      return { success: false, error: errorMsg };
    }
  }

  async signup(email: string, password: string, name: string, role: 'teacher' | 'student'): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const res = await API.post('/auth/signup', {
        email,
        password,
        name,
        role: role.toLowerCase(),
      });
      const data = res.data;

      sessionStorage.setItem('exam-spark-token', data.token);
      sessionStorage.setItem('exam-spark-user', JSON.stringify(data.user));

      return { success: true, user: data.user };
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Network error';
      return { success: false, error: errorMsg };
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
