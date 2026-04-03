import React, { useState, useRef } from 'react';
import { Shield, Lock, User, UserPlus, Flame, Camera } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const AuthView = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ username: '', password: '', email: '', role: 'user', profileImage: '' });
    const [error, setError] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 600 * 1024) {
            setError('Image too large. Please choose an image under 600KB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const base64 = ev.target.result;
            setImagePreview(base64);
            setFormData(f => ({ ...f, profileImage: base64 }));
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const payload = isLogin
            ? { username: formData.username, password: formData.password }
            : {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                role: formData.role,
                profileImage: formData.profileImage,
              };

        try {
            const res = await fetch(`http://localhost:8080${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            let data;
            try { data = await res.json(); }
            catch { data = { message: "Invalid server response" }; }

            if (res.ok && isLogin) {
                // Pass full user info to App
                const userInfo = {
                    username: data.username,
                    email: data.email,
                    roles: data.roles,
                    profileImage: data.profileImage || null,
                };
                onLogin(data.token, data.roles, userInfo);
            } else if (res.ok && !isLogin) {
                setIsLogin(true);
                setImagePreview(null);
                setFormData({ username: '', password: '', email: '', role: 'user', profileImage: '' });
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
                maxWidth: '460px',
                padding: '3.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem' }}>
                    <div className="avatar" style={{ width: '110px', height: '110px', borderRadius: '20px', padding: '0', overflow: 'hidden' }}>
                        <img src="/logo.png" alt="FlareSense Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '2.4rem', fontWeight: '900', letterSpacing: '-1.5px', color: 'var(--text-primary)' }}>
                        FlareSense
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: 0, fontWeight: '500' }}>
                        {isLogin ? "Control Center Authorization" : "Enroll New Security Protocol"}
                    </p>
                </div>

                {error && (
                    <div style={{
                        color: error.includes('successful') ? 'var(--accent-green)' : 'var(--accent-red)',
                        background: error.includes('successful') ? 'rgba(0,255,170,0.1)' : 'rgba(255, 51, 102, 0.1)',
                        padding: '14px', borderRadius: '12px',
                        border: `1px solid ${error.includes('successful') ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                        fontSize: '0.9rem', fontWeight: '700'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {/* Profile Image Picker (register only) */}
                    {!isLogin && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    width: '90px', height: '90px', borderRadius: '50%',
                                    border: '2px dashed var(--accent-blue)',
                                    background: imagePreview ? 'transparent' : 'rgba(0,210,255,0.05)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', overflow: 'hidden', position: 'relative',
                                    transition: 'border-color 0.2s',
                                }}
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <Camera size={24} color="var(--accent-blue)" />
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: '700' }}>UPLOAD</div>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleImageChange}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Profile photo (optional, max 600KB)</span>
                        </div>
                    )}

                    {/* Username */}
                    <div style={{ position: 'relative' }}>
                        <User size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 10 }} />
                        <input
                            type="text" placeholder="Username" required className="glass-input"
                            style={{ paddingLeft: '50px' }}
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>

                    {/* Email (register only) */}
                    {!isLogin && (
                        <div style={{ position: 'relative' }}>
                            <UserPlus size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 10 }} />
                            <input
                                type="email" placeholder="Email Address" required className="glass-input"
                                style={{ paddingLeft: '50px' }}
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    )}

                    {/* Password */}
                    <div style={{ position: 'relative' }}>
                        <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 10 }} />
                        <input
                            type="password" placeholder="Passkey" required className="glass-input"
                            style={{ paddingLeft: '50px' }}
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    {/* Role selector (register only) */}
                    {!isLogin && (
                        <div style={{ textAlign: 'left' }}>
                            <label style={{ color: 'var(--accent-blue)', fontSize: '0.85rem', fontWeight: '800', marginBottom: '8px', display: 'block', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Authority Level</label>
                            <select
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                className="glass-input"
                            >
                                <option value="user">Standard Monitor</option>
                                <option value="admin">Global Administrator</option>
                            </select>
                        </div>
                    )}

                    <button type="submit" className="vibrant-btn" style={{ padding: '18px', fontSize: '1.05rem' }}>
                        {isLogin ? 'ESTABLISH LINK' : 'CREATE PROTOCOL'}
                    </button>

                    <button
                        type="button"
                        onClick={() => { setIsLogin(!isLogin); setError(''); setImagePreview(null); }}
                        style={{
                            background: 'transparent', border: 'none',
                            color: 'var(--text-secondary)', cursor: 'pointer',
                            fontSize: '0.95rem', fontWeight: '600', textDecoration: 'underline'
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
