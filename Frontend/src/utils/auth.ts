import API from '../services/api';

export interface User {
  id: number;
  email: string;
  role: 'teacher' | 'student';
  name: string;
  profile_pic_url?: string;
  roll_no?: string;
  class_name?: string;
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

  async signup(email: string, password: string, name: string, role: 'teacher' | 'student', profilePic: File, roll_no: string, class_name: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      formData.append('name', name);
      formData.append('role', role.toLowerCase());
      formData.append('profile_pic', profilePic);
      formData.append('roll_no', roll_no);
      formData.append('class_name', class_name);

      const res = await API.post('/auth/signup', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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
