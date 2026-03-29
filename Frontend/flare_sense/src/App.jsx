import { useState } from 'react';
import Dashboard from './Dashboard';
import AuthView from './components/AuthView';
import LandingPage from './LandingPage';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [roles, setRoles] = useState(JSON.parse(localStorage.getItem('roles')) || []);
  const [showLogin, setShowLogin] = useState(false);

  const handleLogin = (newToken, newRoles) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('roles', JSON.stringify(newRoles));
    setToken(newToken);
    setRoles(newRoles);
    setShowLogin(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('roles');
    setToken(null);
    setRoles([]);
  };

  if (token) {
    return (
      <ThemeProvider>
        <Dashboard token={token} roles={roles} onLogout={handleLogout} />
      </ThemeProvider>
    );
  }

  if (showLogin) {
    return (
      <ThemeProvider>
        <AuthView onLogin={handleLogin} />
        <button 
          onClick={() => setShowLogin(false)}
          className="fixed top-4 right-4 z-[100] px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all"
        >
          Back to Home
        </button>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div onClick={() => {
        // If the user clicks "Get Started" or similar, we can trigger login
        // For now, I'll add a listener or just rely on a button in LandingPage if I can pass it down
      }}>
        <LandingPage onShowLogin={() => setShowLogin(true)} />
      </div>
    </ThemeProvider>
  );
}

export default App;
