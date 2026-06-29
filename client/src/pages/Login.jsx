import { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [tab, setTab] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSignIn = async () => {
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
    try {
      setLoading(true);
      setError('');
      const res = await api.post('/auth/signin', { email: form.email, password: form.password });
      login(res.data.user);
      navigate('/');
    } catch (err) {
      try {
        const res = await api.post('/auth/signin', { email: form.email, password: form.password });
        login(res.data.user);
        navigate('/');
      } catch (retryErr) {
        setError(retryErr.response?.data?.error || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError('Please fill in all fields.'); return;
    }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    try {
      setLoading(true);
      setError('');
      const res = await api.post('/auth/signup', { name: form.name, email: form.email, password: form.password });
      login(res.data.user);
      navigate('/');
    } catch (err) {
      try {
        const res = await api.post('/auth/signup', { name: form.name, email: form.email, password: form.password });
        login(res.data.user);
        navigate('/');
      } catch (retryErr) {
        setError(retryErr.response?.data?.error || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
window.location.href = `${serverUrl}/api/auth/google`;

  const inputStyle = {
    backgroundColor: '#FFFFFF',
    border: '0.5px solid #C8BDE5',
    color: '#160A3A',
  };

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#EDE8FF' }}>

      <div className="w-full max-w-sm rounded-2xl p-10"
        style={{ backgroundColor: '#E2DBF2', border: '0.5px solid #C8BDE5' }}>

        {/* Logo + Title */}
        <div className="flex flex-col items-center mb-6">
          <div className="text-4xl mb-3">💬</div>
          <h1 className="text-2xl font-medium tracking-tight" style={{ color: '#160A3A' }}>
            ChatApp
          </h1>
          <p className="text-sm mt-1 text-center" style={{ color: '#6B5A9B' }}>
            Connect with anyone, one request at a time
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-full p-1 mb-6"
          style={{ backgroundColor: '#D5CCEB', border: '0.5px solid #C8BDE5' }}>
          <button
            onClick={() => { setTab('signin'); setError(''); }}
            className="flex-1 py-2 rounded-full text-sm font-medium transition-all duration-150"
            style={{
              backgroundColor: tab === 'signin' ? '#4A2D9C' : 'transparent',
              color: tab === 'signin' ? '#FFFFFF' : '#6B5A9B',
            }}>
            Sign In
          </button>
          <button
            onClick={() => { setTab('signup'); setError(''); }}
            className="flex-1 py-2 rounded-full text-sm font-medium transition-all duration-150"
            style={{
              backgroundColor: tab === 'signup' ? '#4A2D9C' : 'transparent',
              color: tab === 'signup' ? '#FFFFFF' : '#6B5A9B',
            }}>
            Sign Up
          </button>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col gap-4">

          {tab === 'signup' && (
            <div>
              <label className="text-xs uppercase tracking-wider mb-1 block"
                style={{ color: '#6B5A9B' }}>Full Name</label>
              <input
                name="name" value={form.name} onChange={handleChange}
                placeholder="John Doe"
                className="w-full h-11 rounded-xl px-4 text-sm outline-none"
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label className="text-xs uppercase tracking-wider mb-1 block"
              style={{ color: '#6B5A9B' }}>Email Address</label>
            <input
              name="email" type="email" value={form.email} onChange={handleChange}
              placeholder="name@example.com"
              className="w-full h-11 rounded-xl px-4 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider mb-1 block"
              style={{ color: '#6B5A9B' }}>Password</label>
            <input
              name="password" type="password" value={form.password} onChange={handleChange}
              placeholder="••••••••"
              className="w-full h-11 rounded-xl px-4 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          {tab === 'signup' && (
            <div>
              <label className="text-xs uppercase tracking-wider mb-1 block"
                style={{ color: '#6B5A9B' }}>Confirm Password</label>
              <input
                name="confirmPassword" type="password" value={form.confirmPassword}
                onChange={handleChange} placeholder="••••••••"
                className="w-full h-11 rounded-xl px-4 text-sm outline-none"
                style={inputStyle}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-center" style={{ color: '#D85A30' }}>{error}</p>
          )}

          <button
            onClick={tab === 'signin' ? handleSignIn : handleSignUp}
            disabled={loading}
            className="w-full h-12 rounded-full text-sm font-medium transition-all"
            style={{
              backgroundColor: '#4A2D9C',
              color: '#FFFFFF',
              opacity: loading ? 0.7 : 1,
            }}>
            {loading ? 'Please wait...' : tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: '#C8BDE5' }}></div>
            <span className="text-xs" style={{ color: '#6B5A9B' }}>OR</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#C8BDE5' }}></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full h-12 rounded-full text-sm flex items-center justify-center gap-3 transition-all"
            style={{
              backgroundColor: '#FFFFFF',
              border: '0.5px solid #C8BDE5',
              color: '#160A3A',
            }}>
            <span className="text-lg">G</span>
            Continue with Google
          </button>

        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#9B8EC4' }}>
          By continuing you agree to our Terms of Service
        </p>

      </div>
    </div>
  );
};

export default Login;