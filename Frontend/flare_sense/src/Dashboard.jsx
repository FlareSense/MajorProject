
import React, { useState, useEffect } from 'react';
import { Flame, AlertTriangle, Activity, Camera, ShieldCheck, Thermometer, Users, Box, Map as MapIcon, Download, LogOut, Search, Bell, User } from 'lucide-react';
import { motion } from 'framer-motion';
import AnalyticsMap from './components/AnalyticsMap';
import FireDetailsModal from './components/FireDetailsModal';
import IncidentDetailsModal from './components/IncidentDetailsModal';
import TwilioSetup from './components/TwilioSetup';
import NotificationGuide from './components/NotificationGuide';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './context/ThemeContext';

const Dashboard = ({ token, roles, userInfo, onLogout, onUserInfoUpdate }) => {
    // Navigation State
    const [activeView, setActiveView] = useState('overview');
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [selectedIncidentId, setSelectedIncidentId] = useState(null);

    // System Data State
    const [cameras, setCameras] = useState({});
    const [systemStatus, setSystemStatus] = useState({});
    const [alerts, setAlerts] = useState([]);
    const [analyticsData, setAnalyticsData] = useState(null);

    // User Management State
    const [userList, setUserList] = useState([]);
    const [userForm, setUserForm] = useState({ username: '', password: '', email: '', role: 'user' });

    // History filter + DB state
    const [historyFilter, setHistoryFilter] = useState('all');
    const [historySearch, setHistorySearch] = useState('');
    const [dbHistory, setDbHistory] = useState([]);
    const [dbLoading, setDbLoading] = useState(false);

    // Bell dropdown state
    const [bellOpen, setBellOpen] = useState(false);
    const bellRef = React.useRef(null);

    // User profile dropdown state
    const [userOpen, setUserOpen] = useState(false);
    const userRef = React.useRef(null);

    // Search query (header search bar)
    const [searchQuery, setSearchQuery] = useState('');

    // Edit Profile state
    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [profileForm, setProfileForm] = useState({ username: '', password: '', profileImage: '' });
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState(null);
    const profileImgRef = React.useRef(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e) => {
            if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
            if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Fetch DB history when History tab opens
    useEffect(() => {
        if (activeView === 'history') {
            setDbLoading(true);
            fetch('http://localhost:8080/api/analytics/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.ok ? res.json() : [])
            .then(events => {
                const mapped = (events || []).map(e => ({
                    id: e.id,
                    type: e.severity === 'HIGH' ? 'critical' : e.severity === 'MEDIUM' ? 'warning' : 'info',
                    message: `[DB] Zone ${e.zone || '?'} — Confidence: ${((e.confidence || 0) * 100).toFixed(0)}% | Severity: ${e.severity}`,
                    time: new Date(e.timestamp).toLocaleString(),
                    source: 'db',
                }));
                setDbHistory(mapped);
            })
            .catch(() => setDbHistory([]))
            .finally(() => setDbLoading(false));
        }
    }, [activeView, token]);

    const fetchUsers = () => {
        fetch('http://localhost:8080/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => setUserList(data))
        .catch(err => console.error("Error fetching users:", err));
    };

    const deleteUser = (id) => {
        if (!window.confirm("Are you sure you want to terminate this resident's access?")) return;
        fetch(`http://localhost:8080/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(() => fetchUsers())
        .catch(err => console.error("Error deleting user:", err));
    };

    const toggleCamera = (cameraId) => {
        const currentActive = systemStatus[cameraId]?.camera_active !== false;
        const newState = !currentActive;

        fetch('http://localhost:5000/api/camera/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ camera_id: cameraId, active: newState })
        }).catch(err => {
            console.error("Camera Toggle Error:", err);
        });

        // Optimistic update
        setSystemStatus(prev => ({
            ...prev,
            [cameraId]: { ...(prev[cameraId] || {}), camera_active: newState }
        }));
    };

    // Fetch Available Cameras
    useEffect(() => {
        fetch('http://localhost:5000/api/cameras')
            .then(res => res.json())
            .then(data => setCameras(data))
            .catch(err => console.error("Error fetching cameras:", err));
    }, []);

    // Fetch Analytics Data
    const fetchAnalytics = () => {
        fetch('http://localhost:8080/api/analytics/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setAnalyticsData(data))
            .catch(err => console.error("Analytics Error:", err));
    };

    // Poll Backend API for real-time status
    useEffect(() => {
        if (activeView === 'analytics') {
            fetchAnalytics();
        }
        if (activeView === 'users') {
            fetchUsers();
        }

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(position => {
                const { latitude, longitude } = position.coords;
                fetch('http://localhost:5000/api/location', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lat: latitude, lon: longitude })
                }).catch(err => console.error("Error sending location:", err));
            }, error => {
                console.error("Error getting location:", error);
            });
        }

        const interval = setInterval(() => {
            fetch('http://localhost:5000/api/status')
                .then(res => res.json())
                .then(data => {
                    setSystemStatus(data);

                    // Process alerts for each camera
                    Object.keys(data).forEach(camId => {
                        const camStatus = data[camId];
                        if (camStatus.detected) {
                            const newAlert = {
                                id: `${camId}-${Date.now()}`,
                                time: new Date().toLocaleTimeString(),
                                message: `[${camStatus.location}] ${camStatus.message}`,
                                type: camStatus.evacuation_needed ? 'critical-evacuee' : (camStatus.severity === "High" ? 'critical' : 'warning')
                            };

                            setAlerts(prev => {
                                // Simple debounce per camera based on timestamp
                                const recent = prev.find(a => a.message === newAlert.message && (Date.now() - parseInt(a.id.split('-')[1]) < 5000));
                                if (!recent) {
                                    return [newAlert, ...prev].slice(0, 50);
                                }
                                return prev;
                            });
                        }
                    });
                })
                .catch(err => console.error("API Error:", err));
        }, 1000);

        return () => clearInterval(interval);
    }, [activeView]);

    // Helper to determine OVERALL status
    const isAnyThreatDetected = Object.values(systemStatus).some(cam => cam?.detected);
    const isAnyEvacuationNeeded = Object.values(systemStatus).some(cam => cam?.evacuation_needed);

    const getOverallStatusColor = () => {
        if (!isAnyThreatDetected) return "#4dff4d";
        if (isAnyEvacuationNeeded) return "#ff00ff"; // Magenta for evacuation
        if (Object.values(systemStatus).some(cam => cam?.severity === "High")) return "#ff4d4d"; // Red
        return "#ffa500";
    };

    const getCamStatusColor = (camStatus) => {
        if (!camStatus?.detected) return "#4dff4d";
        if (camStatus?.evacuation_needed) return "#ff00ff";
        if (camStatus?.severity === "High") return "#ff4d4d";
        return "#ffa500";
    };

    return (
        <div className="dashboard-container">
            {/* Sidebar / Navigation */}
            <nav className="glass-nav">
                <div className="logo" style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
                    <img 
                        src="/logo.png" 
                        alt="FlareSense Logo" 
                        style={{ width: '110px', height: '110px', borderRadius: '15px', boxShadow: '0 0 20px rgba(0, 210, 255, 0.2)', objectFit: 'contain' }}
                    />
                    <h1 style={{ fontSize: '1.6rem', letterSpacing: '-1px', margin: 0, color: 'var(--text-primary)' }}>FLARESENSE</h1>
                </div>

                <ThemeToggle />

                <div className="nav-links" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                        className={activeView === 'overview' ? 'active' : ''}
                        onClick={() => setActiveView('overview')}
                    >
                        <ShieldCheck size={20} /> Overview
                    </button>
                    <button
                        className={activeView === 'dashboard' ? 'active' : ''}
                        onClick={() => setActiveView('dashboard')}
                    >
                        <Activity size={20} /> Monitoring
                    </button>
                    <button
                        className={activeView === 'live' ? 'active' : ''}
                        onClick={() => setActiveView('live')}
                    >
                        <Camera size={20} /> Live Feed
                    </button>
                    <button
                        className={activeView === 'history' ? 'active' : ''}
                        onClick={() => setActiveView('history')}
                    >
                        <AlertTriangle size={20} /> History
                    </button>
                    <button
                        className={activeView === 'analytics' ? 'active' : ''}
                        onClick={() => setActiveView('analytics')}
                    >
                        <MapIcon size={20} /> Analytics
                    </button>
                    {roles && (roles.includes('ROLE_ADMIN') || roles.includes('ROLE_USER')) && (
                        <button
                            className={activeView === 'users' ? 'active' : ''}
                            onClick={() => setActiveView('users')}
                        >
                            <Users size={20} /> Residents
                        </button>
                    )}
                    {roles && (roles.includes('ROLE_ADMIN') || roles.includes('ROLE_USER')) && (
                        <button
                            className={activeView === 'settings' ? 'active' : ''}
                            onClick={() => setActiveView('settings')}
                        >
                            <Box size={20} /> Settings
                        </button>
                    )}
                    <button
                        className={activeView === 'profile' ? 'active' : ''}
                        onClick={() => setActiveView('profile')}
                    >
                        <User size={20} /> My Profile
                    </button>
                </div>

                <div className="sidebar-footer" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div className="user-profile-nav">
                        <div className="avatar">
                            {roles.includes('ROLE_ADMIN') ? 'AD' : 'RS'}
                        </div>
                        <div className="user-info">
                            <span className="user-name">Resident Hub</span>
                            <span className="user-role">{roles.includes('ROLE_ADMIN') ? 'Administrator' : 'Resident'}</span>
                        </div>
                        <button onClick={onLogout} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '5px' }}>
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="main-content">
                {/* Global Header */}
                <header className="global-header">
                    <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                            {activeView}
                        </h2>
                        {/* Mobile and Desktop System Status Component */}
                        <div className={`system-status ${!isAnyThreatDetected ? 'breathing' : ''}`} style={{ padding: '8px 16px', borderRadius: '99px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'default' }}>
                            <ShieldCheck size={18} color={getOverallStatusColor()} />
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {isAnyThreatDetected ? (isAnyEvacuationNeeded ? "EVACUATION" : "THREAT") : "Secure"}
                            </span>
                        </div>
                    </div>
                    <div className="header-right header-actions">
                        {/* Search bar */}
                        <div className="search-bar">
                            <Search size={18} color="var(--text-secondary)" />
                            <input
                                type="text"
                                placeholder="Search incidents, cameras..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && searchQuery.trim()) {
                                        setHistorySearch(searchQuery.trim());
                                        setActiveView('history');
                                        setSearchQuery('');
                                    }
                                }}
                            />
                        </div>

                        {/* BELL DROPDOWN */}
                        <div ref={bellRef} style={{ position: 'relative' }}>
                            <button className="icon-btn" onClick={() => setBellOpen(o => !o)} style={{ position: 'relative' }}>
                                <Bell size={20} />
                                {alerts.length > 0 && (
                                    <span style={{
                                        position: 'absolute', top: '4px', right: '4px',
                                        width: '8px', height: '8px', borderRadius: '50%',
                                        background: '#ff3366', border: '2px solid var(--nav-bg)'
                                    }} />
                                )}
                            </button>
                            {bellOpen && (
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                                    width: '360px', zIndex: 1000,
                                    background: 'var(--nav-bg)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '16px',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                            Notifications {alerts.length > 0 && <span style={{ background: 'rgba(255,51,102,0.15)', color: '#ff3366', borderRadius: '99px', padding: '2px 8px', fontSize: '0.7rem', marginLeft: '6px' }}>{alerts.length}</span>}
                                        </span>
                                        <button onClick={() => { setAlerts([]); setBellOpen(false); }} style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', letterSpacing: '0.5px' }}>CLEAR ALL</button>
                                    </div>
                                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                                        {alerts.length === 0 ? (
                                            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                <Bell size={28} style={{ opacity: 0.2, marginBottom: '10px', display: 'block', margin: '0 auto 10px' }} />
                                                <div>No notifications yet</div>
                                            </div>
                                        ) : (
                                            [...alerts].reverse().slice(0, 10).map((alert, i) => {
                                                const barColor = alert.type === 'critical-evacuee' ? '#ef4444' : alert.type === 'critical' ? '#f59e0b' : alert.type === 'warning' ? '#3b82f6' : '#6b7280';
                                                return (
                                                    <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid var(--glass-border)', borderLeft: `3px solid ${barColor}`, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{alert.message}</span>
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{alert.time}</span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    {alerts.length > 10 && (
                                        <div style={{ padding: '10px 20px', textAlign: 'center', borderTop: '1px solid var(--glass-border)' }}>
                                            <button onClick={() => { setActiveView('history'); setBellOpen(false); }} style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}>View all {alerts.length} alerts →</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* USER PROFILE DROPDOWN */}
                        <div ref={userRef} style={{ position: 'relative' }}>
                            <button
                                className="icon-btn"
                                onClick={() => setUserOpen(o => !o)}
                                style={{ position: 'relative', overflow: 'hidden', padding: userInfo?.profileImage ? '0' : undefined, borderRadius: userInfo?.profileImage ? '50%' : undefined }}
                            >
                                {userInfo?.profileImage ? (
                                    <img src={userInfo.profileImage} alt="avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    <User size={20} />
                                )}
                            </button>
                            {userOpen && (
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 12px)', right: 0,
                                    width: '260px', zIndex: 1000,
                                    background: 'var(--nav-bg)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '20px',
                                    boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
                                    overflow: 'hidden',
                                    backdropFilter: 'blur(20px)',
                                }}>
                                    {/* Header gradient band */}
                                    <div style={{
                                        padding: '24px 20px 20px',
                                        background: 'linear-gradient(145deg, rgba(0,210,255,0.08) 0%, rgba(167,139,250,0.08) 100%)',
                                        borderBottom: '1px solid var(--glass-border)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
                                    }}>
                                        {/* Avatar */}
                                        <div style={{
                                            width: '68px', height: '68px', borderRadius: '50%',
                                            overflow: 'hidden',
                                            border: `3px solid ${roles?.includes('ROLE_ADMIN') ? '#ef4444' : 'var(--accent-blue)'}`,
                                            background: 'var(--glass-bg)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: `0 0 20px ${roles?.includes('ROLE_ADMIN') ? 'rgba(239,68,68,0.3)' : 'rgba(0,210,255,0.25)'}`,
                                        }}>
                                            {userInfo?.profileImage ? (
                                                <img src={userInfo.profileImage} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '1.6rem', fontWeight: '900', color: roles?.includes('ROLE_ADMIN') ? '#ef4444' : 'var(--accent-blue)' }}>
                                                    {(userInfo?.username || 'U')[0].toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        {/* Name + email */}
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontWeight: '900', fontSize: '1.05rem', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{userInfo?.username || 'User'}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px' }}>{userInfo?.email || '—'}</div>
                                        </div>
                                        {/* Role badge */}
                                        <span style={{
                                            padding: '4px 14px', borderRadius: '99px', fontSize: '0.62rem', fontWeight: '900',
                                            letterSpacing: '1px', textTransform: 'uppercase',
                                            background: roles?.includes('ROLE_ADMIN') ? 'rgba(239,68,68,0.12)' : 'rgba(0,210,255,0.12)',
                                            color: roles?.includes('ROLE_ADMIN') ? '#ef4444' : 'var(--accent-blue)',
                                            border: `1px solid ${roles?.includes('ROLE_ADMIN') ? 'rgba(239,68,68,0.3)' : 'rgba(0,210,255,0.3)'}`,
                                        }}>
                                            {roles?.includes('ROLE_ADMIN') ? '⚡ Administrator' : '🛡 Monitor'}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ padding: '10px' }}>
                                        <button
                                            onClick={() => { setUserOpen(false); setActiveView('profile'); }}
                                            style={{
                                                width: '100%', padding: '11px', marginBottom: '6px',
                                                background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                                                borderRadius: '12px', color: 'var(--text-primary)',
                                                fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                                        >
                                            <User size={15} /> Edit Profile
                                        </button>
                                        <button
                                            onClick={() => { setUserOpen(false); onLogout(); }}
                                            style={{
                                                width: '100%', padding: '11px',
                                                background: 'rgba(255,51,102,0.07)', border: '1px solid rgba(255,51,102,0.2)',
                                                borderRadius: '12px', color: 'var(--accent-red)',
                                                fontWeight: '800', fontSize: '0.85rem', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,51,102,0.14)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,51,102,0.07)'}
                                        >
                                            <LogOut size={15} /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Conditional View Rendering */}
                <div className="content-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* VIEW: PROJECT OVERVIEW */}
                    {activeView === 'overview' && (() => {
                        const totalCameras = Object.keys(cameras).length;
                        const onlineCameras = Object.keys(systemStatus).filter(id => systemStatus[id]?.camera_active !== false).length;
                        const activeThreats = Object.values(systemStatus).filter(s => s?.detected).length;
                        const totalPersons = Object.values(systemStatus).reduce((sum, s) => sum + (s?.person_count || 0), 0);
                        const sessionAlerts = alerts.length;

                        const statCards = [
                            {
                                label: 'Cameras Online',
                                value: `${onlineCameras} / ${totalCameras || '—'}`,
                                icon: Camera,
                                color: '#00d2ff',
                                bg: 'rgba(0, 210, 255, 0.08)',
                                border: 'rgba(0, 210, 255, 0.25)',
                                pulse: false,
                            },
                            {
                                label: 'Active Threats',
                                value: activeThreats,
                                icon: Flame,
                                color: activeThreats > 0 ? '#ff3366' : '#4dff4d',
                                bg: activeThreats > 0 ? 'rgba(255, 51, 102, 0.08)' : 'rgba(0, 255, 170, 0.08)',
                                border: activeThreats > 0 ? 'rgba(255, 51, 102, 0.3)' : 'rgba(0, 255, 170, 0.25)',
                                pulse: activeThreats > 0,
                            },
                            {
                                label: 'Persons Detected',
                                value: totalPersons,
                                icon: Users,
                                color: '#ffaa00',
                                bg: 'rgba(255, 170, 0, 0.08)',
                                border: 'rgba(255, 170, 0, 0.25)',
                                pulse: false,
                            },
                            {
                                label: 'Session Alerts',
                                value: sessionAlerts,
                                icon: AlertTriangle,
                                color: '#a78bfa',
                                bg: 'rgba(167, 139, 250, 0.08)',
                                border: 'rgba(167, 139, 250, 0.25)',
                                pulse: false,
                            },
                        ];

                        return (
                            <div style={{ animation: 'slideUpFade 0.6s ease-out' }}>
                                {/* LIVE STATS BAR */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                                    {statCards.map(({ label, value, icon: Icon, color, bg, border, pulse }, idx) => (
                                        <motion.div 
                                            key={label} 
                                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            whileHover={{ y: -8, scale: 1.02, boxShadow: `0 20px 40px ${color}25`, borderColor: `${color}60` }}
                                            transition={{ duration: 0.5, delay: idx * 0.1, ease: 'easeOut' }}
                                            className={`glass-panel ${pulse ? 'breathing' : ''}`} 
                                            style={{
                                                cursor: 'pointer',
                                                padding: '24px',
                                                border: `1px solid ${border}`,
                                                background: bg,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '14px',
                                                position: 'relative',
                                                overflow: 'hidden',
                                            }}>
                                            {/* Glow orb */}
                                            <div style={{
                                                position: 'absolute', top: '-20px', right: '-20px',
                                                width: '80px', height: '80px',
                                                borderRadius: '50%',
                                                background: color,
                                                opacity: 0.08,
                                                filter: 'blur(20px)',
                                                pointerEvents: 'none',
                                            }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{
                                                    width: '44px', height: '44px', borderRadius: '12px',
                                                    background: `${color}18`,
                                                    border: `1px solid ${color}30`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <Icon size={22} color={color} />
                                                </div>
                                                {pulse && (
                                                    <span style={{
                                                        fontSize: '0.65rem', fontWeight: '900',
                                                        color: '#ff3366', background: 'rgba(255,51,102,0.15)',
                                                        border: '1px solid rgba(255,51,102,0.3)',
                                                        padding: '3px 8px', borderRadius: '99px',
                                                        textTransform: 'uppercase', letterSpacing: '1px',
                                                        animation: 'pulse 1.5s infinite',
                                                    }}>LIVE</span>
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '2.4rem', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-1px' }}>
                                                    {value}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '6px' }}>
                                                    {label}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* MISSION CARDS */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '30px' }}>
                                    <motion.div 
                                        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -10, boxShadow: '0 25px 50px rgba(255, 51, 102, 0.15)', borderColor: 'rgba(255, 51, 102, 0.3)' }} transition={{ duration: 0.6, delay: 0.3 }}
                                        className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '15px', cursor: 'default' }}>
                                        <div style={{ background: 'rgba(255, 51, 102, 0.1)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <AlertTriangle size={28} color="var(--accent-red)" />
                                        </div>
                                        <h3 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>The Global Crisis</h3>
                                        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem', margin: 0 }}>
                                            Every year, uncontrolled fires destroy over <strong>4 million hectares</strong> of land. Traditional smoke detectors activate 5–10 minutes too late for structural salvation.
                                        </p>
                                    </motion.div>
                                    <motion.div 
                                        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -10, boxShadow: '0 25px 50px rgba(0, 210, 255, 0.15)', borderColor: 'rgba(0, 210, 255, 0.3)' }} transition={{ duration: 0.6, delay: 0.4 }}
                                        className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '15px', cursor: 'default' }}>
                                        <div style={{ background: 'rgba(0, 210, 255, 0.1)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Activity size={28} color="var(--accent-blue)" />
                                        </div>
                                        <h3 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>Sub-Second Inference</h3>
                                        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem', margin: 0 }}>
                                            Our custom <strong>YOLOv11 Architecture</strong> analyzes 30 fps. By detecting thermal blooming and particulate strings, we cut response times by up to <strong>85%</strong>.
                                        </p>
                                    </motion.div>
                                    <motion.div 
                                        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -10, boxShadow: '0 25px 50px rgba(0, 255, 170, 0.15)', borderColor: 'rgba(0, 255, 170, 0.3)' }} transition={{ duration: 0.6, delay: 0.5 }}
                                        className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '15px', cursor: 'default' }}>
                                        <div style={{ background: 'rgba(0, 255, 170, 0.1)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Flame size={28} color="var(--accent-green)" />
                                        </div>
                                        <h3 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>Instant Intervention</h3>
                                        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '0.95rem', margin: 0 }}>
                                            Detected threats trigger immediate broadcasts via <strong>WhatsApp, Telegram, and SMS</strong> with high-resolution visual evidence on secure cloud CDN.
                                        </p>
                                    </motion.div>
                                </div>

                                {/* TECH STACK */}
                                <div className="glass-panel" style={{ padding: '1.5rem 2rem', borderStyle: 'dashed', display: 'flex', alignItems: 'center', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--accent-blue)', whiteSpace: 'nowrap' }}>Stack</span>
                                    {['PyTorch ML', 'OpenCV Vision', 'Spring Boot', 'Twilio', 'React'].map(tech => (
                                        <span key={tech} style={{ fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{tech}</span>
                                    ))}
                                </div>

                                {/* PROJECT INFO */}
                                <div className="glass-panel" style={{ padding: '2rem', marginTop: '24px', background: 'linear-gradient(135deg, rgba(0,210,255,0.04) 0%, rgba(167,139,250,0.04) 100%)' }}>
                                    <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
                                        Protecting Lives through <span style={{ color: 'var(--accent-blue)' }}>AI Surveillance</span>
                                    </h2>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '1rem', maxWidth: '760px', margin: '0 0 24px 0' }}>
                                        FlareSense is a state-of-the-art Early Warning System (EWS) that uses Deep Learning to detect fire and smoke anomalies
                                        seconds after ignition — preventing massive disasters before they consume entire communities.
                                    </p>
                                    <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Team</div>
                                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                                {['Uday', 'Pavan', 'Kiran', 'Anvesh'].map(name => (
                                                    <span key={name} style={{ padding: '4px 14px', border: '1px solid var(--glass-border)', borderRadius: '99px', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' }}>{name}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <a
                                            href="https://github.com/Uday531/MajorProject"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '99px', color: 'var(--text-primary)', fontWeight: '700', fontSize: '0.85rem', textDecoration: 'none', transition: 'border-color 0.2s' }}
                                        >
                                            View on GitHub ↗
                                        </a>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* VIEW: DASHBOARD & LIVE FEED */}
                    {(activeView === 'dashboard' || activeView === 'live') && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(300px, 1fr)', gap: '24px', width: '100%', alignItems: 'start' }}>
                            
                            {/* LEFT COLUMN: CAMERAS FOCUS */}
                            <motion.div 
                                initial={{ opacity: 0, x: -30 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
                            >
                                {Object.keys(cameras).map(camId => {
                                    const camInfo = cameras[camId];
                                    const status = systemStatus[camId] || {};
                                    const isCamActive = status.camera_active !== false;

                                    return (
                                        <div key={camId} className="video-section glass-panel" style={{
                                            padding: '0', 
                                            overflow: 'hidden',
                                            border: status.evacuation_needed ? '1px solid #ff4d4f' : '1px solid var(--glass-border)'
                                        }}>
                                            {/* Camera Header Integrated Over Video */}
                                            <div style={{
                                                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
                                                padding: '12px 20px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span className="live-badge" style={{
                                                        backgroundColor: getCamStatusColor(status),
                                                        opacity: isCamActive ? 1 : 0.6,
                                                        animation: isCamActive && status.detected ? 'pulse Red 1.5s infinite' : 'none',
                                                        padding: '6px 14px', fontSize: '0.85rem', color: '#fff'
                                                    }}>
                                                        {isCamActive ? (status.evacuation_needed ? "EVACUATE" : (status.detected ? "DETECTING" : "LIVE FEED")) : "OFFLINE"}
                                                    </span>
                                                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                                                        {camInfo.name}
                                                    </h2>
                                                </div>

                                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                                    {status.person_count > 0 && (
                                                        <span style={{ fontSize: '1.05rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', background: 'rgba(0,0,0,0.4)', padding: '6px 14px', borderRadius: '20px', backdropFilter: 'blur(5px)' }}>
                                                            <Users size={18} /> {status.person_count} Detected
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => toggleCamera(camId)}
                                                        style={{
                                                            background: isCamActive ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.9)',
                                                            border: 'none',
                                                            color: '#fff',
                                                            padding: '10px 24px',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            fontWeight: '800',
                                                            fontSize: '0.95rem',
                                                            letterSpacing: '1px',
                                                            transition: 'all 0.2s ease',
                                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                        }}
                                                    >
                                                        {isCamActive ? 'STOP FEED' : 'START FEED'}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="video-wrapper" style={{ aspectRatio: '16/9', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRadius: '14px', overflow: 'hidden' }}>
                                                {isCamActive ? (
                                                    <img
                                                        src={`http://localhost:5000/video_feed/${camId}`}
                                                        alt={`Live Feed ${camInfo.name}`}
                                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                    />
                                                ) : (
                                                    <div style={{ color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                                        <Camera size={48} opacity={0.5} />
                                                        <span>Camera Standby Mode</span>
                                                    </div>
                                                )}

                                                {/* Sleek Tooltip Overlay for Diagnosis */}
                                                {status.detected && isCamActive && (
                                                    <div className="sleek-tooltip" style={{
                                                        background: 'rgba(15, 23, 42, 0.85)',
                                                        backdropFilter: 'blur(10px)',
                                                        border: `1px solid ${status.evacuation_needed ? '#ef4444' : '#f59e0b'}`,
                                                        padding: '12px 20px',
                                                        borderRadius: '8px',
                                                        position: 'absolute',
                                                        bottom: '20px',
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                            <Flame color={status.evacuation_needed ? '#ff3333' : '#ff9900'} size={24} />
                                                            <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#ffffff', fontWeight: '900', letterSpacing: '0.5px' }}>
                                                                {status.message}
                                                            </h3>
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: '1rem', color: '#e2e8f0', fontWeight: '700' }}>
                                                            {status.evacuation_needed
                                                                ? `IMMEDIATE DANGER TO ${status.person_count} PERSON(S). DISPATCH RESCUE.`
                                                                : "CONFIDENCE LEVEL: " + Math.round((status.confidence || 0) * 100) + "% | SEVERITY: " + status.severity.toUpperCase()}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </motion.div>

                            {/* RIGHT COLUMN: EVENT LOG (STICKY) */}
                            <motion.div 
                                initial={{ opacity: 0, x: 30 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                                className="alerts-section glass-panel" 
                                style={{ position: 'sticky', top: '24px', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}
                            >
                                <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(120,120,120,0.03)' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)' }}>
                                        <AlertTriangle size={22} color="var(--accent-blue)" /> Global Events
                                    </h2>
                                    <button 
                                        onClick={() => setAlerts([])}
                                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.95rem', cursor: 'pointer', textTransform: 'uppercase', fontWeight: '800', transition: 'color 0.2s', letterSpacing: '1px' }}
                                        onMouseOver={e => e.target.style.color = '#ffffff'}
                                        onMouseOut={e => e.target.style.color = '#94a3b8'}
                                    >
                                        Clear
                                    </button>
                                </div>
                                
                                <div className="alerts-list" style={{ padding: '15px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {alerts.length === 0 ? <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>System is secure.<br/>No active threats logged.</div> : null}
                                    {alerts.map((alert, index) => (
                                        <div key={index} className="premium-alert-item" style={{
                                            padding: '12px 16px',
                                            borderRadius: '12px',
                                            background: alert.type === 'critical-evacuee' ? 'rgba(239, 68, 68, 0.12)' : (alert.type === 'critical' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.04)'),
                                            borderLeft: `4px solid ${alert.type === 'critical-evacuee' ? '#ef4444' : (alert.type === 'critical' ? '#f59e0b' : '#3b82f6')}`,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '5px',
                                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                            animation: `slideUpFade 0.5s ease backwards ${index * 0.05}s`
                                        }}>
                                            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>{alert.time}</span>
                                            <span style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>{alert.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                        </div>
                    )}

                    {/* VIEW: HISTORY — DB-backed + Filterable */}
                    {activeView === 'history' && (() => {
                        // Merge DB history + session alerts (DB first, session on top)
                        const allAlerts = [
                            ...alerts.map(a => ({ ...a, source: 'session' })),
                            ...dbHistory,
                        ];

                        const severityMap = {
                            'critical-evacuee': 'critical',
                            'critical': 'critical',
                            'warning': 'warning',
                            'info': 'info',
                        };

                        const filtered = allAlerts.filter(alert => {
                            const matchesSeverity = historyFilter === 'all' || severityMap[alert.type] === historyFilter || alert.type === historyFilter;
                            const matchesSearch = historySearch === '' || alert.message.toLowerCase().includes(historySearch.toLowerCase());
                            return matchesSeverity && matchesSearch;
                        });

                        const filterBtns = [
                            { key: 'all', label: `All (${allAlerts.length})`, color: 'var(--accent-blue)' },
                            { key: 'critical', label: 'Critical', color: 'var(--accent-red)' },
                            { key: 'warning', label: 'Warning', color: '#f59e0b' },
                            { key: 'info', label: 'Info', color: 'var(--accent-green)' },
                        ];

                        const typeColors = {
                            'critical-evacuee': { bg: 'rgba(239,68,68,0.1)', bar: '#ef4444', label: 'EVACUATE' },
                            'critical':         { bg: 'rgba(245,158,11,0.1)', bar: '#f59e0b', label: 'CRITICAL' },
                            'warning':          { bg: 'rgba(59,130,246,0.08)', bar: '#3b82f6', label: 'WARNING' },
                            'info':             { bg: 'rgba(255,255,255,0.04)', bar: '#6b7280', label: 'INFO' },
                        };

                        return (
                            <div style={{ animation: 'slideUpFade 0.5s ease-out', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Thermometer size={24} color="var(--accent-blue)" /> Incident History
                                        </h2>
                                        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            {dbLoading ? '⏳ Loading database records...' : `${filtered.length} of ${allAlerts.length} incidents (${alerts.length} session + ${dbHistory.length} from DB)`}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setAlerts([])}
                                        style={{ background: 'transparent', border: '1px solid rgba(255,51,102,0.3)', color: 'var(--accent-red)', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', letterSpacing: '1px' }}
                                    >
                                        CLEAR ALL
                                    </button>
                                </div>

                                {/* Filters + Search */}
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {filterBtns.map(({ key, label, color }) => (
                                        <button
                                            key={key}
                                            onClick={() => setHistoryFilter(key)}
                                            style={{
                                                padding: '8px 16px', borderRadius: '99px', fontWeight: '800', fontSize: '0.78rem',
                                                textTransform: 'uppercase', letterSpacing: '0.8px', cursor: 'pointer',
                                                border: `1px solid ${historyFilter === key ? color : 'var(--glass-border)'}`,
                                                background: historyFilter === key ? `${color}18` : 'var(--glass-bg)',
                                                color: historyFilter === key ? color : 'var(--text-secondary)',
                                                transition: 'all 0.2s',
                                            }}
                                        >{label}</button>
                                    ))}
                                    <input
                                        value={historySearch}
                                        onChange={e => setHistorySearch(e.target.value)}
                                        placeholder="Search alerts..."
                                        style={{
                                            marginLeft: 'auto', padding: '8px 16px', background: 'var(--glass-bg)',
                                            border: '1px solid var(--glass-border)', borderRadius: '99px',
                                            color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
                                            width: '220px', fontFamily: 'var(--font-body)'
                                        }}
                                    />
                                </div>

                                {/* Alert List */}
                                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                                    {filtered.length === 0 ? (
                                        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            <Thermometer size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                            <div style={{ fontWeight: '700' }}>No incidents match the current filter.</div>
                                            <div style={{ fontSize: '0.85rem', marginTop: '6px', opacity: 0.7 }}>The system is secure and running.</div>
                                        </div>
                                    ) : (
                                        filtered.map((alert, index) => {
                                            const tc = typeColors[alert.type] || typeColors['info'];
                                            return (
                                                <div key={index} style={{
                                                    padding: '16px 24px',
                                                    borderBottom: index < filtered.length - 1 ? '1px solid var(--glass-border)' : 'none',
                                                    background: tc.bg,
                                                    borderLeft: `4px solid ${tc.bar}`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '16px',
                                                    animation: `slideUpFade 0.4s ease backwards ${index * 0.03}s`,
                                                }}>
                                                    <span style={{ fontSize: '0.62rem', fontWeight: '900', color: tc.bar, background: `${tc.bar}20`, border: `1px solid ${tc.bar}40`, padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                                                        {tc.label}
                                                    </span>
                                                    <span style={{ fontSize: '0.92rem', color: 'var(--text-primary)', flex: 1, lineHeight: 1.5 }}>{alert.message}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontWeight: '600' }}>{alert.time}</span>
                                                    {alert.source === 'db' && alert.id && (
                                                        <button
                                                            onClick={() => setSelectedIncidentId(alert.id)}
                                                            style={{
                                                                flexShrink: 0,
                                                                padding: '6px 14px',
                                                                borderRadius: '8px',
                                                                border: `1px solid ${tc.bar}50`,
                                                                background: `${tc.bar}12`,
                                                                color: tc.bar,
                                                                fontSize: '0.75rem',
                                                                fontWeight: '800',
                                                                cursor: 'pointer',
                                                                letterSpacing: '0.5px',
                                                                textTransform: 'uppercase',
                                                                transition: 'all 0.2s',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = `${tc.bar}25`; e.currentTarget.style.borderColor = tc.bar; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = `${tc.bar}12`; e.currentTarget.style.borderColor = `${tc.bar}50`; }}
                                                        >
                                                            🔍 Get Details
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* VIEW: ANALYTICS */}
                    {activeView === 'analytics' && (() => {
                        // Build severity data from both backend + session alerts
                        const sessionSeverity = {
                            EVACUATE: alerts.filter(a => a.type === 'critical-evacuee').length,
                            HIGH:     alerts.filter(a => a.type === 'critical').length,
                            WARNING:  alerts.filter(a => a.type === 'warning').length,
                            INFO:     alerts.filter(a => a.type === 'info').length,
                        };
                        const backendSeverity = analyticsData?.stats?.severity_counts || {};
                        const merged = {
                            EVACUATE: (sessionSeverity.EVACUATE || 0) + (backendSeverity.EVACUATE || 0),
                            HIGH:     (sessionSeverity.HIGH || 0)     + (backendSeverity.HIGH     || 0),
                            WARNING:  (sessionSeverity.WARNING || 0)  + (backendSeverity.MEDIUM   || 0),
                            INFO:     (sessionSeverity.INFO || 0)     + (backendSeverity.LOW      || 0),
                        };
                        const total = Object.values(merged).reduce((s, v) => s + v, 0);
                        const hasData = total > 0;

                        const bars = [
                            { label: 'Evacuate', value: merged.EVACUATE, color: '#ef4444' },
                            { label: 'High',     value: merged.HIGH,     color: '#f59e0b' },
                            { label: 'Warning',  value: merged.WARNING,  color: '#3b82f6' },
                            { label: 'Info',     value: merged.INFO,     color: '#6b7280' },
                        ];
                        const maxBar = Math.max(...bars.map(b => b.value), 1);

                        // Donut chart data
                        const donutColors = ['#ef4444','#f59e0b','#3b82f6','#6b7280'];
                        const donutData = bars.filter(b => b.value > 0);
                        let cumAngle = -Math.PI / 2;
                        const donutPaths = donutData.map((d, i) => {
                            const angle = (d.value / Math.max(total, 1)) * 2 * Math.PI;
                            const x1 = 60 + 48 * Math.cos(cumAngle);
                            const y1 = 60 + 48 * Math.sin(cumAngle);
                            cumAngle += angle;
                            const x2 = 60 + 48 * Math.cos(cumAngle);
                            const y2 = 60 + 48 * Math.sin(cumAngle);
                            const large = angle > Math.PI ? 1 : 0;
                            const xi = 60 + 30 * Math.cos(cumAngle - angle / 2);
                            const yi = 60 + 30 * Math.sin(cumAngle - angle / 2);
                            return { path: `M60,60 L${x1},${y1} A48,48 0 ${large},1 ${x2},${y2} Z`, color: d.color, label: d.label, xi, yi, value: d.value };
                        });

                        return (
                            <div style={{ animation: 'slideUpFade 0.5s ease-out', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Activity size={24} color="var(--accent-blue)" /> Fire Analytics
                                        </h2>
                                        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            {analyticsData ? 'Backend data + session events' : 'Session events only (backend offline)'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => window.location.href = 'http://localhost:5000/api/analytics/export'}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,210,255,0.1)', border: '1px solid rgba(0,210,255,0.3)', color: 'var(--accent-blue)', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem' }}
                                    >
                                        <Download size={14} /> Export PDF
                                    </button>
                                </div>

                                {!hasData ? (
                                    <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        <Activity size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                        <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>No incident data yet.</div>
                                        <div style={{ fontSize: '0.85rem', marginTop: '8px', opacity: 0.7 }}>Data will appear here as the system detects threats.</div>
                                    </div>
                                ) : (
                                    <>
                                        {/* CHARTS ROW */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                                            {/* BAR CHART */}
                                            <div className="glass-panel" style={{ padding: '24px' }}>
                                                <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Severity Breakdown</h3>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                                    {bars.map(({ label, value, color }) => (
                                                        <div key={label}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary)' }}>{label}</span>
                                                                <span style={{ fontSize: '0.82rem', fontWeight: '900', color }}>{value}</span>
                                                            </div>
                                                            <div style={{ height: '8px', borderRadius: '99px', background: 'var(--glass-border)', overflow: 'hidden' }}>
                                                                <div style={{
                                                                    height: '100%', borderRadius: '99px',
                                                                    background: color,
                                                                    width: `${(value / maxBar) * 100}%`,
                                                                    transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                                                                    boxShadow: `0 0 8px ${color}88`,
                                                                }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Total Incidents</span>
                                                    <span style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-primary)' }}>{total}</span>
                                                </div>
                                            </div>

                                            {/* DONUT CHART */}
                                            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', alignSelf: 'flex-start' }}>Distribution</h3>
                                                <svg viewBox="0 0 120 120" width="160" height="160">
                                                    {donutPaths.map((d, i) => (
                                                        <path key={i} d={d.path} fill={d.color} opacity="0.9" />
                                                    ))}
                                                    <circle cx="60" cy="60" r="30" fill="var(--nav-bg)" />
                                                    <text x="60" y="57" textAnchor="middle" fontSize="12" fontWeight="900" fill="var(--text-primary)">{total}</text>
                                                    <text x="60" y="70" textAnchor="middle" fontSize="7" fill="var(--text-secondary)">TOTAL</text>
                                                </svg>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '12px' }}>
                                                    {bars.filter(b => b.value > 0).map(({ label, color, value }) => (
                                                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: color, display: 'inline-block' }} />
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '700' }}>{label} ({Math.round((value/total)*100)}%)</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* MAP + EVENT LIST (when backend available) */}
                                        {analyticsData && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px' }}>
                                                <div style={{ background: 'rgba(120,120,120,0.05)', padding: '15px', borderRadius: '15px' }}>
                                                    <h3 style={{ marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Geospatial Heatmap</h3>
                                                    <AnalyticsMap events={analyticsData.events} />
                                                    <div style={{ marginTop: '10px', display: 'flex', gap: '15px', fontSize: '0.8rem', color: '#aaa' }}>
                                                        <span style={{ color: '#ff4d4d' }}>🔴 High</span>
                                                        <span style={{ color: '#ffa500' }}>🟠 Medium</span>
                                                        <span style={{ color: '#4dff4d' }}>🟢 Low</span>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {[{label:'Total',value:analyticsData.stats.total_events,color:'var(--text-primary)'},{label:'High',value:analyticsData.stats.severity_counts.HIGH||0,color:'#ff4d4d'},{label:'Medium',value:analyticsData.stats.severity_counts.MEDIUM||0,color:'#ffa500'}].map(s => (
                                                        <div key={s.label} className="glass-panel" style={{ padding: '14px', textAlign: 'center' }}>
                                                            <h4 style={{ margin:'0 0 6px', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>{s.label}</h4>
                                                            <span style={{ fontSize: '1.8rem', fontWeight: '900', color: s.color }}>{s.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })()}

                    {/* VIEW: RESIDENT MANAGEMENT */}
                    {activeView === 'users' && (roles.includes('ROLE_ADMIN') || roles.includes('ROLE_USER')) && (
                        <div style={{ animation: 'slideUpFade 0.6s ease-out', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            <div className="panel-header" style={{ marginBottom: '10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <h2 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <Users size={32} color="var(--accent-blue)" /> Resident Management
                                    </h2>
                                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Apartment Owner Control: Track and Manage Clearance</p>
                                </div>
                                <div className="glass-panel" style={{ padding: '10px 20px', background: 'rgba(0, 210, 255, 0.1)', border: '1px solid var(--accent-blue)' }}>
                                    <span style={{ fontWeight: '800', fontSize: '1.2rem' }}>
                                        {userList.length} / 7 <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>CAPACITY</span>
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: roles.includes('ROLE_ADMIN') ? '1fr 2fr' : '1fr', gap: '30px' }}>
                                {/* Enrollment Form */}
                                {roles.includes('ROLE_ADMIN') && (
                                    <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Enroll New Resident</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            <input 
                                                placeholder="Username" 
                                                className="glass-input" 
                                                value={userForm.username}
                                                onChange={e => setUserForm({...userForm, username: e.target.value})}
                                            />
                                            <input 
                                                placeholder="Email" 
                                                className="glass-input" 
                                                value={userForm.email}
                                                onChange={e => setUserForm({...userForm, email: e.target.value})}
                                            />
                                            <input 
                                                type="password"
                                                placeholder="Password" 
                                                className="glass-input" 
                                                value={userForm.password}
                                                onChange={e => setUserForm({...userForm, password: e.target.value})}
                                            />
                                            <select 
                                                className="glass-input" 
                                                value={userForm.role}
                                                onChange={e => setUserForm({...userForm, role: e.target.value})}
                                            >
                                                <option value="user">Rental User</option>
                                                <option value="admin">Apartment Owner (Admin)</option>
                                            </select>
                                            <button 
                                                className="vibrant-btn"
                                                onClick={() => {
                                                    fetch('http://localhost:8080/api/admin/users', {
                                                        method: 'POST',
                                                        headers: { 
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${token}` 
                                                        },
                                                        body: JSON.stringify(userForm)
                                                    })
                                                    .then(res => res.json())
                                                    .then(data => {
                                                        alert(data.message);
                                                        if (!data.message.includes("Error") && !data.message.includes("Max")) {
                                                            fetchUsers();
                                                            setUserForm({ username: '', password: '', email: '', role: 'user' });
                                                        }
                                                    });
                                                }}
                                            >
                                                GENERATE CLEARANCE
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Residents Table */}
                                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead style={{ background: 'var(--glass-bg)', borderBottom: '1px solid var(--glass-border)' }}>
                                            <tr>
                                                <th style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>IDENTIFIER</th>
                                                <th style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>CONTACT</th>
                                                <th style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>TIER</th>
                                                {roles.includes('ROLE_ADMIN') && (
                                                    <th style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>ACTIONS</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {userList.map((user, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='var(--glass-bg)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                                                    <td style={{ padding: '20px', fontWeight: '700' }}>{user.username}</td>
                                                    <td style={{ padding: '20px', color: 'var(--text-secondary)' }}>{user.email}</td>
                                                    <td style={{ padding: '20px' }}>
                                                        <span style={{ 
                                                            padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800',
                                                            background: user.roles.includes('ROLE_ADMIN') ? 'rgba(0, 210, 255, 0.12)' : 'var(--glass-bg)',
                                                            color: user.roles.includes('ROLE_ADMIN') ? 'var(--accent-blue)' : 'var(--text-secondary)',
                                                            border: `1px solid ${user.roles.includes('ROLE_ADMIN') ? 'var(--accent-blue)' : 'var(--glass-border)'}`
                                                        }}>
                                                            {user.roles.includes('ROLE_ADMIN') ? 'OWNER' : 'RENTAL'}
                                                        </span>
                                                    </td>
                                                    {roles.includes('ROLE_ADMIN') && (
                                                        <td style={{ padding: '20px' }}>
                                                            {!user.roles.includes('ROLE_ADMIN') && (
                                                                <button 
                                                                    onClick={() => deleteUser(user.id)}
                                                                    style={{ background: 'transparent', border: '1px solid rgba(255, 51, 102, 0.3)', color: 'var(--accent-red)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}
                                                                >
                                                                    TERMINATE
                                                                </button>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VIEW: TWILIO SETUP */}
                    {activeView === 'settings' && (roles.includes('ROLE_ADMIN') || roles.includes('ROLE_USER')) && (
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap', maxWidth: '1000px', margin: '0 auto' }}>
                            <div style={{ flex: '1 1 500px' }}>
                                <TwilioSetup token={token} />
                            </div>
                            <div style={{ flex: '0 0 340px' }}>
                                <NotificationGuide />
                            </div>
                        </div>
                    )}

                    {/* ── VIEW: MY PROFILE ─────────────────────────────────────────── */}
                    {activeView === 'profile' && (() => {
                        const isAdmin = roles?.includes('ROLE_ADMIN');
                        const accentColor = isAdmin ? '#ef4444' : 'var(--accent-blue)';
                        const accentGlow  = isAdmin ? 'rgba(239,68,68,0.25)' : 'rgba(0,210,255,0.25)';
                        return (
                            <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', animation: 'slideUpFade 0.4s ease' }}>
                                {/* Page title */}
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>My Profile</h2>
                                    <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage your account details and security settings</p>
                                </div>

                                {/* — Card: Identity ———————————————————————————————— */}
                                <div className="glass-panel" style={{ padding: '32px', display: 'flex', gap: '32px', alignItems: 'center' }}>
                                    {/* Big avatar + upload */}
                                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                        <div
                                            onClick={() => profileImgRef.current?.click()}
                                            style={{
                                                width: '110px', height: '110px', borderRadius: '50%', cursor: 'pointer',
                                                border: `3px solid ${accentColor}`,
                                                boxShadow: `0 0 30px ${accentGlow}`,
                                                overflow: 'hidden', position: 'relative',
                                                background: 'var(--glass-bg)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'box-shadow 0.3s',
                                            }}
                                            title="Click to upload a new photo"
                                        >
                                            {(profileForm.profileImage || userInfo?.profileImage) ? (
                                                <img src={profileForm.profileImage || userInfo.profileImage} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '2.8rem', fontWeight: '900', color: accentColor }}>
                                                    {(userInfo?.username || 'U')[0].toUpperCase()}
                                                </span>
                                            )}
                                            {/* overlay on hover */}
                                            <div style={{
                                                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                opacity: 0, transition: 'opacity 0.2s',
                                            }}
                                                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                                            >
                                                <span style={{ fontSize: '1.4rem' }}>📷</span>
                                                <span style={{ fontSize: '0.62rem', color: '#fff', fontWeight: '800', letterSpacing: '0.5px' }}>CHANGE</span>
                                            </div>
                                        </div>
                                        <input ref={profileImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            if (file.size > 600 * 1024) { setProfileMsg({ ok: false, text: 'Image too large (max 600KB)' }); return; }
                                            const reader = new FileReader();
                                            reader.onload = ev => setProfileForm(f => ({ ...f, profileImage: ev.target.result }));
                                            reader.readAsDataURL(file);
                                        }} />
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Click avatar to<br/>change photo</span>
                                    </div>
                                    {/* Identity info */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{userInfo?.username || 'User'}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>{userInfo?.email || 'No email set'}</div>
                                        <div style={{ marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                padding: '5px 16px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: '900',
                                                letterSpacing: '1px', textTransform: 'uppercase',
                                                background: isAdmin ? 'rgba(239,68,68,0.12)' : 'rgba(0,210,255,0.12)',
                                                color: accentColor, border: `1px solid ${isAdmin ? 'rgba(239,68,68,0.3)' : 'rgba(0,210,255,0.3)'}`,
                                            }}>
                                                {isAdmin ? '⚡ Administrator' : '🛡 Monitor'}
                                            </span>
                                            <span style={{
                                                padding: '5px 16px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: '700',
                                                letterSpacing: '0.5px',
                                                background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                                                border: '1px solid rgba(34,197,94,0.25)',
                                            }}>
                                                ● Active
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* — Card: Update Details ——————————————————————————— */}
                                <div className="glass-panel" style={{ padding: '32px' }}>
                                    <div style={{ marginBottom: '24px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-primary)' }}>Account Details</h3>
                                        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Update your username or change your password</p>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        {/* Email (read-only) */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>Email Address</label>
                                            <div style={{ padding: '12px 16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '0.92rem', fontWeight: '700' }}>
                                                {userInfo?.email || '—'}
                                                <span style={{ fontSize: '0.65rem', marginLeft: '8px', opacity: 0.5 }}>(cannot change)</span>
                                            </div>
                                        </div>
                                        {/* Role (read-only) */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>Role</label>
                                            <div style={{ padding: '12px 16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '0.92rem', fontWeight: '700' }}>
                                                {isAdmin ? 'Administrator' : 'Monitor / Resident'}
                                            </div>
                                        </div>
                                        {/* New username */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>New Username</label>
                                            <input
                                                type="text"
                                                autoComplete="off"
                                                placeholder={userInfo?.username || 'Enter new username'}
                                                value={profileForm.username}
                                                onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))}
                                                style={{ padding: '12px 16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '0.92rem', outline: 'none', fontFamily: 'var(--font-body)', transition: 'border-color 0.2s' }}
                                                onFocus={e => e.target.style.borderColor = accentColor}
                                                onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
                                            />
                                        </div>
                                        {/* New password */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>New Password</label>
                                            <input
                                                type="password"
                                                autoComplete="new-password"
                                                placeholder="Leave blank to keep current"
                                                value={profileForm.password}
                                                onChange={e => setProfileForm(f => ({ ...f, password: e.target.value }))}
                                                style={{ padding: '12px 16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--text-primary)', fontSize: '0.92rem', outline: 'none', fontFamily: 'var(--font-body)', transition: 'border-color 0.2s' }}
                                                onFocus={e => e.target.style.borderColor = accentColor}
                                                onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
                                            />
                                        </div>
                                    </div>

                                    {/* Feedback message */}
                                    {profileMsg && (
                                        <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '12px', fontWeight: '700', fontSize: '0.88rem', background: profileMsg.ok ? 'rgba(0,255,170,0.08)' : 'rgba(255,51,102,0.08)', color: profileMsg.ok ? 'var(--accent-green)' : 'var(--accent-red)', border: `1px solid ${profileMsg.ok ? 'var(--accent-green)' : 'var(--accent-red)'}` }}>
                                            {profileMsg.text}
                                        </div>
                                    )}

                                    {/* Save */}
                                    <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                                        <button
                                            disabled={profileSaving}
                                            onClick={() => {
                                                const payload = {};
                                                if (profileForm.username.trim()) payload.username = profileForm.username.trim();
                                                if (profileForm.password.trim()) payload.password = profileForm.password.trim();
                                                if (profileForm.profileImage) payload.profileImage = profileForm.profileImage;
                                                if (!Object.keys(payload).length) { setProfileMsg({ ok: false, text: 'No changes to save.' }); return; }
                                                setProfileSaving(true);
                                                setProfileMsg(null);
                                                fetch('http://localhost:8080/api/auth/profile', {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                                    body: JSON.stringify(payload),
                                                })
                                                .then(r => r.json())
                                                .then(data => {
                                                    if (data.message === 'Profile updated successfully') {
                                                        setProfileMsg({ ok: true, text: '✓ Profile updated successfully!' });
                                                        onUserInfoUpdate({ username: data.username, profileImage: data.profileImage });
                                                        setProfileForm({ username: '', password: '', profileImage: '' });
                                                    } else {
                                                        setProfileMsg({ ok: false, text: data.message || 'Update failed' });
                                                    }
                                                })
                                                .catch(() => setProfileMsg({ ok: false, text: 'Network error. Ensure the backend is running.' }))
                                                .finally(() => setProfileSaving(false));
                                            }}
                                            style={{
                                                padding: '13px 32px', borderRadius: '12px', border: 'none',
                                                background: profileSaving ? 'var(--glass-bg)' : `linear-gradient(135deg, ${accentColor}, ${isAdmin ? '#f97316' : 'rgba(167,139,250,1)'})`,
                                                color: '#fff', fontWeight: '900', fontSize: '0.9rem',
                                                cursor: profileSaving ? 'not-allowed' : 'pointer',
                                                letterSpacing: '0.5px', transition: 'all 0.2s',
                                                boxShadow: profileSaving ? 'none' : `0 8px 24px ${accentGlow}`,
                                            }}
                                        >
                                            {profileSaving ? 'Saving…' : 'Save Changes'}
                                        </button>
                                        <button
                                            onClick={() => { setProfileForm({ username: '', password: '', profileImage: '' }); setProfileMsg(null); }}
                                            style={{ padding: '13px 24px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                </div>
            </main>

            {/* Python-backend event modal */}
            {selectedEventId && (
                <FireDetailsModal
                    eventId={selectedEventId}
                    onClose={() => setSelectedEventId(null)}
                />
            )}

            {/* DB incident details modal */}
            {selectedIncidentId && (
                <IncidentDetailsModal
                    eventId={selectedIncidentId}
                    token={token}
                    onClose={() => setSelectedIncidentId(null)}
                />
            )}
        </div>
    );
};

export default Dashboard;
