import { useState } from 'react';
import Dashboard from './Dashboard';
import AuthView from './components/AuthView';
import LandingPage from './LandingPage';
import ChatbotWidget from './components/ChatbotWidget';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [roles, setRoles] = useState(JSON.parse(localStorage.getItem('roles')) || []);
  const [userInfo, setUserInfo] = useState(JSON.parse(localStorage.getItem('userInfo')) || null);
  const [showLogin, setShowLogin] = useState(false);

  // Now receives full user data object from AuthView
  const handleLogin = (newToken, newRoles, newUserInfo) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('roles', JSON.stringify(newRoles));
    localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
    setToken(newToken);
    setRoles(newRoles);
    setUserInfo(newUserInfo);
    setShowLogin(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('roles');
    localStorage.removeItem('userInfo');
    setToken(null);
    setRoles([]);
    setUserInfo(null);
  };

  const handleUserInfoUpdate = (updatedInfo) => {
    const merged = { ...userInfo, ...updatedInfo };
    localStorage.setItem('userInfo', JSON.stringify(merged));
    setUserInfo(merged);
  };

  if (token) {
    return (
      <ThemeProvider>
        <Dashboard token={token} roles={roles} userInfo={userInfo} onLogout={handleLogout} onUserInfoUpdate={handleUserInfoUpdate} />
        <ChatbotWidget />
      </ThemeProvider>
    );
  }

  if (showLogin) {
    return (
      <ThemeProvider>
        <AuthView onLogin={handleLogin} />
        <button
          onClick={() => setShowLogin(false)}
          style={{
            position: 'fixed', top: '1.5rem', left: '1.5rem', zIndex: 200,
            padding: '8px 20px',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: '99px',
            color: 'var(--text-primary)',
            cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem',
            backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', gap: '6px',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          ← Back to Home
        </button>
        <ChatbotWidget />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div>
        <LandingPage onShowLogin={() => setShowLogin(true)} />
      </div>
      <ChatbotWidget />
    </ThemeProvider>
  );
}

export default App;
