
import React, { useState, useEffect } from 'react';
import { Flame, AlertTriangle, Activity, Camera, ShieldCheck, Thermometer, Users, Box, Map as MapIcon, Download, LogOut, Search, Bell, User } from 'lucide-react';
import AnalyticsMap from './components/AnalyticsMap';
import FireDetailsModal from './components/FireDetailsModal';
import TwilioSetup from './components/TwilioSetup';
import ThemeToggle from './components/ThemeToggle';
import { useTheme } from './context/ThemeContext';

const Dashboard = ({ token, roles, onLogout }) => {
    // Navigation State
    const [activeView, setActiveView] = useState('overview');
    const [selectedEventId, setSelectedEventId] = useState(null);

    // System Data State
    const [cameras, setCameras] = useState({});
    const [systemStatus, setSystemStatus] = useState({});

    const [alerts, setAlerts] = useState([]);
    const [analyticsData, setAnalyticsData] = useState(null);

    // User Management State
    const [userList, setUserList] = useState([]);
    const [userForm, setUserForm] = useState({ username: '', password: '', email: '', role: 'user' });

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
                <div className="logo" style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <img 
                        src="/logo.svg" 
                        alt="FlareSense Logo" 
                        style={{ width: '64px', height: '64px', borderRadius: '15px', boxShadow: '0 0 20px rgba(0, 210, 255, 0.2)' }}
                    />
                    <h1 style={{ fontSize: '1.6rem', letterSpacing: '-1px', color: 'var(--text-primary)' }}>FlareSense</h1>
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
                    {roles && roles.includes('ROLE_ADMIN') && (
                        <button
                            className={activeView === 'users' ? 'active' : ''}
                            onClick={() => setActiveView('users')}
                        >
                            <Users size={20} /> Residents
                        </button>
                    )}
                    {roles && roles.includes('ROLE_ADMIN') && (
                        <button
                            className={activeView === 'settings' ? 'active' : ''}
                            onClick={() => setActiveView('settings')}
                        >
                            <Box size={20} /> Settings
                        </button>
                    )}
                </div>

                <div className="sidebar-footer" style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div className={`system-status ${!isAnyThreatDetected ? 'breathing' : ''}`} style={{ padding: '16px', borderRadius: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
                        <ShieldCheck size={20} color={getOverallStatusColor()} />
                        <span style={{ fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {isAnyThreatDetected ? (isAnyEvacuationNeeded ? "EVACUATION" : "THREAT") : "Secure"}
                        </span>
                    </div>

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
                    <div className="header-left">
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                            {activeView}
                        </h2>
                    </div>
                    <div className="header-right header-actions">
                        <div className="search-bar">
                            <Search size={18} color="var(--text-secondary)" />
                            <input type="text" placeholder="Search incidents, cameras..." />
                        </div>
                        <button className="icon-btn">
                            <Bell size={20} />
                            <div className="badge"></div>
                        </button>
                        <button className="icon-btn">
                            <User size={20} />
                        </button>
                    </div>
                </header>

                {/* Conditional View Rendering */}
                <div className="content-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* VIEW: PROJECT OVERVIEW (LANDING PAGE) */}
                    {activeView === 'overview' && (
                        <div style={{ animation: 'slideUpFade 0.6s ease-out' }}>
                            {/* HERO SECTION */}
                            <div className="glass-panel" style={{ 
                                background: 'linear-gradient(135deg, rgba(0, 210, 255, 0.05) 0%, rgba(255, 51, 102, 0.05) 100%)',
                                padding: '4rem 3rem',
                                marginBottom: '30px',
                                textAlign: 'center',
                                border: '1px solid var(--glass-border)'
                            }}>
                                <h1 style={{ fontSize: '3.5rem', fontWeight: '900', marginBottom: '20px', letterSpacing: '-2px', color: 'var(--text-primary)' }}>
                                    Protecting Lives through <span style={{ color: 'var(--accent-blue)' }}>AI Surveillance</span>
                                </h1>
                                <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
                                    FlareSense is a state-of-the-art Early Warning System (EWS) that uses Deep Learning to detect fire and smoke anomalies 
                                    seconds after ignition—preventing massive disasters before they consume entire communities.
                                </p>
                            </div>

                            {/* IMPACT GRID */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px', marginBottom: '40px' }}>
                                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ background: 'rgba(255, 51, 102, 0.1)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <AlertTriangle size={28} color="var(--accent-red)" />
                                    </div>
                                    <h3 style={{ fontSize: '1.6rem', margin: 0 }}>The Global Crisis</h3>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', fontSize: '1.05rem' }}>
                                        Every year, uncontrolled fires destroy over <strong>4 million hectares</strong> of land and thousands of residential properties. 
                                        Traditional smoke detectors only activate when smoke reaches the ceiling, often 5-10 minutes too late for structural salvation.
                                    </p>
                                </div>

                                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ background: 'rgba(0, 210, 255, 0.1)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Activity size={28} color="var(--accent-blue)" />
                                    </div>
                                    <h3 style={{ fontSize: '1.6rem', margin: 0 }}>Sub-Second Inference</h3>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', fontSize: '1.05rem' }}>
                                        Our custom-trained <strong>YOLOv11 Architecture</strong> analyzes 30 frames per second. By identifying 
                                        the visual signature of "Thermal Blooming" and "Particulate Strings" (Smoke), we intercept emergencies 
                                        at the point of origin, decreasing response times by up to <strong>85%</strong>.
                                    </p>
                                </div>

                                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ background: 'rgba(0, 255, 170, 0.1)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Flame size={28} color="var(--accent-green)" />
                                    </div>
                                    <h3 style={{ fontSize: '1.6rem', margin: 0 }}>Instant Intervention</h3>
                                    <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', fontSize: '1.05rem' }}>
                                        FlareSense doesn't just watch—it acts. Detected threats trigger an immediate multi-channel broadcast 
                                        via <strong>WhatsApp, Telegram, and SMS</strong>, providing first responders with high-resolution 
                                        visual evidence stored on our secure cloud CDN.
                                    </p>
                                </div>
                            </div>

                            {/* TECH STACK FOOTER */}
                            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderStyle: 'dashed' }}>
                                <h4 style={{ textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--accent-blue)', marginBottom: '15px' }}>Technology Stack</h4>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap', opacity: 0.8 }}>
                                    <span style={{ fontWeight: '700' }}>PyTorch ML</span>
                                    <span style={{ fontWeight: '700' }}>OpenCV Vision</span>
                                    <span style={{ fontWeight: '700' }}>Spring Boot Backend</span>
                                    <span style={{ fontWeight: '700' }}>Twilio Multi-Channel</span>
                                    <span style={{ fontWeight: '700' }}>React UI Engine</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VIEW: DASHBOARD & LIVE FEED */}
                    {(activeView === 'dashboard' || activeView === 'live') && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(300px, 1fr)', gap: '24px', width: '100%', alignItems: 'start' }}>
                            
                            {/* LEFT COLUMN: CAMERAS FOCUS */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
                            </div>

                            {/* RIGHT COLUMN: EVENT LOG (STICKY) */}
                            <div className="alerts-section glass-panel" style={{ position: 'sticky', top: '24px', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
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
                            </div>

                        </div>
                    )}

                    {/* VIEW: HISTORY */}
                    {activeView === 'history' && (
                        <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
                            <h2><Thermometer size={20} /> Extensive Incident History</h2>
                            <p>Recent incidents logged by the system.</p>
                            <div className="alerts-list" style={{ marginTop: '20px' }}>
                                {alerts.map((alert, index) => (
                                    <div key={index} className={`alert-item ${alert.type}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <span className="timestamp">{alert.time}</span>
                                            <span className="message">{alert.message} - {alert.type.toUpperCase()}</span>
                                        </div>
                                        {/* Note: In real history from DB, we would have IDs. For local alerts, we don't have DB IDs yet unless we fetch. */}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* VIEW: ANALYTICS */}
                    {activeView === 'analytics' && analyticsData && (
                        <div className="glass-panel" style={{ gridColumn: '1 / -1', minHeight: '80vh' }}>
                            <div className="panel-header" style={{ marginBottom: '20px' }}>
                                <h2><Activity size={20} /> Fire Analytics & Zone Classification</h2>
                                <button
                                    className="clear-btn"
                                    style={{ background: '#00aaff', border: 'none', color: 'white' }}
                                    onClick={() => window.location.href = 'http://localhost:5000/api/analytics/export'}
                                >
                                    <Download size={16} /> Download Report (PDF)
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px' }}>
                                {/* Map Section */}
                                <div style={{ background: 'rgba(120,120,120,0.05)', padding: '15px', borderRadius: '15px' }}>
                                    <h3 style={{ marginBottom: '10px', color: 'var(--text-secondary)' }}>Geospatial Heatmap</h3>
                                    <AnalyticsMap events={analyticsData.events} />
                                    <div style={{ marginTop: '10px', display: 'flex', gap: '15px', fontSize: '0.8rem', color: '#aaa' }}>
                                        <span style={{ color: '#ff4d4d' }}>🔴 High Severity (Red Zone)</span>
                                        <span style={{ color: '#ffa500' }}>🟠 Medium Severity (Orange Zone)</span>
                                        <span style={{ color: '#4dff4d' }}>🟢 Low Severity (Green Zone)</span>
                                    </div>
                                </div>

                                {/* Stats Column */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div className="glass-panel" style={{ padding: '15px', background: 'rgba(255,255,255,0.05)' }}>
                                        <h4>Total Incidents</h4>
                                        <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>{analyticsData.stats.total_events}</span>
                                    </div>
                                    <div className="glass-panel" style={{ padding: '15px', background: 'rgba(255, 77, 77, 0.1)' }}>
                                        <h4 style={{ color: '#ff4d4d' }}>High Severity</h4>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff4d4d' }}>
                                            {analyticsData.stats.severity_counts.HIGH || 0}
                                        </span>
                                    </div>
                                    <div className="glass-panel" style={{ padding: '15px', background: 'rgba(255, 165, 0, 0.1)' }}>
                                        <h4 style={{ color: '#ffa500' }}>Medium Severity</h4>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffa500' }}>
                                            {analyticsData.stats.severity_counts.MEDIUM || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed List */}
                            <div style={{ marginTop: '30px' }}>
                                <h3>Recent Events</h3>
                                <div className="alerts-list">
                                    {analyticsData.events.slice(0, 10).map((event, index) => (
                                        <div key={index} className="alert-item" style={{ borderLeft: `4px solid ${event.severity === 'HIGH' ? '#ff4d4d' : 'orange'}` }}>
                                            <span className="timestamp">{new Date(event.timestamp).toLocaleString()}</span>
                                            <span className="message">Detected at {event.latitude?.toFixed(4) || "Unknown"}, {event.longitude?.toFixed(4) || "Unknown"}</span>
                                            <button
                                                onClick={() => setSelectedEventId(event.id)}
                                                style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #aaa', color: '#aaa', borderRadius: '5px', padding: '2px 8px', cursor: 'pointer' }}
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VIEW: RESIDENT MANAGEMENT */}
                    {activeView === 'users' && roles.includes('ROLE_ADMIN') && (
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

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                                {/* Enrollment Form */}
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

                                {/* Residents Table */}
                                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                                            <tr>
                                                <th style={{ padding: '20px' }}>IDENTIFIER</th>
                                                <th style={{ padding: '20px' }}>CONTACT</th>
                                                <th style={{ padding: '20px' }}>TIER</th>
                                                <th style={{ padding: '20px' }}>ACTIONS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {userList.map((user, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                    <td style={{ padding: '20px', fontWeight: '700' }}>{user.username}</td>
                                                    <td style={{ padding: '20px', color: 'var(--text-secondary)' }}>{user.email}</td>
                                                    <td style={{ padding: '20px' }}>
                                                        <span style={{ 
                                                            padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800',
                                                            background: user.roles.includes('ROLE_ADMIN') ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                                            color: user.roles.includes('ROLE_ADMIN') ? 'var(--accent-blue)' : 'white',
                                                            border: `1px solid ${user.roles.includes('ROLE_ADMIN') ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)'}`
                                                        }}>
                                                            {user.roles.includes('ROLE_ADMIN') ? 'OWNER' : 'RENTAL'}
                                                        </span>
                                                    </td>
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
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VIEW: TWILIO SETUP */}
                    {activeView === 'settings' && roles.includes('ROLE_ADMIN') && (
                        <TwilioSetup token={token} />
                    )}

                </div>
            </main>

            {/* Modal */}
            {selectedEventId && (
                <FireDetailsModal
                    eventId={selectedEventId}
                    onClose={() => setSelectedEventId(null)}
                />
            )}
        </div>
    );
};

export default Dashboard;
