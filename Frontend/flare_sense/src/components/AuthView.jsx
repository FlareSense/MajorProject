import React, { useState } from 'react';
import { Shield, Lock, User, UserPlus, Flame } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const AuthView = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', password: '', email: '', role: 'user' });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const payload = isLogin 
            ? { username: formData.username, password: formData.password }
            : { username: formData.username, email: formData.email, password: formData.password, role: formData.role };

        try {
            const res = await fetch(`http://localhost:8080${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            let data;
            try {
                data = await res.json();
            } catch {
                data = { message: "Invalid server response" };
            }

            if (res.ok && isLogin) {
                onLogin(data.token, data.roles);
            } else if (res.ok && !isLogin) {
                setIsLogin(true);
                setError("Registration successful! Please login.");
            } else {
                setError(data.message || "Authentication failed");
            }
        } catch (err) {
            setError("Gateway unreachable. Please ensure the Java Spring Boot service is active on port 8080.");
        }
    };

    return (
        <div className="auth-wrapper" style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '100vh',
            width: '100vw',
            background: 'var(--bg-color)',
            transition: 'background-color var(--transition-speed)'
        }}>
            <div style={{ position: 'absolute', top: '2rem', right: '2rem' }}>
                <ThemeToggle />
            </div>

            <div className="glass-panel" style={{ 
                width: '100%',
                maxWidth: '450px', 
                padding: '3.5rem', 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '2.5rem'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                    <div className="avatar" style={{ width: '130px', height: '130px', borderRadius: '20px', padding: '0', overflow: 'hidden' }}>
                        <img src="/logo.png" alt="FlareSense Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <h1 style={{ 
                        margin: 0, 
                        fontSize: '2.5rem', 
                        fontWeight: '900', 
                        letterSpacing: '-1.5px',
                        color: 'var(--text-primary)'
                    }}>
                        FlareSense
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0, fontWeight: '500' }}>
                        {isLogin ? "Control Center Authorization" : "Enroll New Security Protocol"}
                    </p>
                </div>
                
                {error && (
                    <div style={{ 
                        color: 'var(--accent-red)', 
                        background: 'rgba(255, 51, 102, 0.1)', 
                        padding: '14px', 
                        borderRadius: '12px',
                        border: '1px solid var(--accent-red)',
                        fontSize: '0.9rem',
                        fontWeight: '700'
                    }}>
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ position: 'relative' }}>
                        <User size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 10 }} />
                        <input 
                            type="text" 
                            placeholder="Username" 
                            required 
                            className="glass-input"
                            style={{ paddingLeft: '50px' }}
                            value={formData.username} 
                            onChange={e => setFormData({...formData, username: e.target.value})}
                        />
                    </div>
                    
                    {!isLogin && (
                        <div style={{ position: 'relative' }}>
                            <UserPlus size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 10 }} />
                            <input 
                                type="email" 
                                placeholder="Email Address" 
                                required 
                                className="glass-input"
                                style={{ paddingLeft: '50px' }}
                                value={formData.email} 
                                onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                        </div>
                    )}
                    
                    <div style={{ position: 'relative' }}>
                        <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 10 }} />
                        <input 
                            type="password" 
                            placeholder="Passkey" 
                            required 
                            className="glass-input"
                            style={{ paddingLeft: '50px' }}
                            value={formData.password} 
                            onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                    </div>

                    {!isLogin && (
                        <div style={{ textAlign: 'left' }}>
                            <label style={{ color: 'var(--accent-blue)', fontSize: '0.85rem', fontWeight: '800', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Authority Level</label>
                            <select 
                                value={formData.role} 
                                onChange={e => setFormData({...formData, role: e.target.value})} 
                                className="glass-input"
                            >
                                <option value="user">Standard Monitor</option>
                                <option value="admin">Global Administrator</option>
                            </select>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="vibrant-btn"
                        style={{ padding: '18px !important', fontSize: '1.1rem !important' }}
                    >
                        {isLogin ? 'ESTABLISH LINK' : 'CREATE PROTOCOL'}
                    </button>
                    
                    <button 
                        type="button" 
                        onClick={() => {setIsLogin(!isLogin); setError('');}} 
                        style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: 'var(--text-secondary)', 
                            cursor: 'pointer', 
                            marginTop: '10px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            textDecoration: 'underline'
                        }}
                    >
                        {isLogin ? "Need remote access? Enroll User" : "Already registered? Login"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AuthView;
