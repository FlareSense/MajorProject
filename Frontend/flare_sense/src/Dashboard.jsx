
import React, { useState, useEffect } from 'react';
import { Flame, AlertTriangle, Activity, Camera, ShieldCheck, Thermometer, Map as MapIcon, Download, FileText } from 'lucide-react';
import AnalyticsMap from './components/AnalyticsMap';
import FireDetailsModal from './components/FireDetailsModal';

const Dashboard = () => {
    // Navigation State
    const [activeView, setActiveView] = useState('dashboard');
    const [selectedEventId, setSelectedEventId] = useState(null);

    // System Data State
    const [systemStatus, setSystemStatus] = useState({
        detected: false,
        severity: "None",
        message: "System Normal",
        confidence: 0.0
    });

    const [alerts, setAlerts] = useState([]);
    const [analyticsData, setAnalyticsData] = useState(null);

    // Camera State
    const [cameraActive, setCameraActive] = useState(true);

    const toggleCamera = () => {
        const newState = !cameraActive;
        setCameraActive(newState);

        fetch('http://localhost:5000/api/camera/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: newState })
        }).catch(err => {
            console.error("Camera Toggle Error:", err);
            setCameraActive(!newState); // Revert on error
        });
    };

    // Fetch Analytics Data
    const fetchAnalytics = () => {
        fetch('http://localhost:5000/api/analytics/stats')
            .then(res => res.json())
            .then(data => setAnalyticsData(data))
            .catch(err => console.error("Analytics Error:", err));
    };

    // Poll Backend API for real-time status
    useEffect(() => {
        if (activeView === 'analytics') {
            fetchAnalytics();
        }

        // GEOLOCATION: Get User Location immediately
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(position => {
                const { latitude, longitude } = position.coords;
                // console.log("Location obtained:", latitude, longitude);

                // Send location to Backend
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

                    // Add to local alerts log if fire is detected and not already logged recently
                    if (data.detected) {
                        const newAlert = {
                            id: Date.now(),
                            time: new Date().toLocaleTimeString(),
                            message: data.message,
                            type: data.severity === "High" ? 'critical' : 'warning'
                        };

                        // Simple logic to avoid flooding the log (only add if last alert was > 5s ago)
                        setAlerts(prev => {
                            const last = prev[0];
                            if (!last || (Date.now() - last.id > 5000)) {
                                return [newAlert, ...prev].slice(0, 50); // Keep last 50
                            }
                            return prev;
                        });
                    }
                })
                .catch(err => console.error("API Error:", err));
        }, 1000); // Check every second

        return () => clearInterval(interval);
    }, [activeView]);

    // Helper to determine status color
    const getStatusColor = () => {
        if (!systemStatus.detected) return "#4dff4d"; // Green
        if (systemStatus.severity === "High") return "#ff4d4d"; // Red
        return "#ffa500"; // Orange
    };

    return (
        <div className="dashboard-container">
            {/* Sidebar / Navigation */}
            <nav className="glass-nav">
                <div className="logo">
                    <Flame color={getStatusColor()} size={32} />
                    <h1>FlareSense</h1>
                </div>
                <div className="nav-links">
                    <button
                        className={activeView === 'dashboard' ? 'active' : ''}
                        onClick={() => setActiveView('dashboard')}
                    >
                        <Activity size={20} /> Dashboard
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
                </div>
                <div className="system-status">
                    <ShieldCheck size={20} color={getStatusColor()} />
                    <span>{systemStatus.detected ? "THREAT DETECTED" : "Secure"}</span>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="main-content">

                {/* Header Stats - Always Visible */}
                <header className="stats-grid">
                    <div className="stat-card glass-panel">
                        <h3>Fire Intensity</h3>
                        <span className={`count ${systemStatus.severity === 'High' ? 'critical' : ''}`}>
                            {systemStatus.severity}
                        </span>
                    </div>
                    <div className="stat-card glass-panel">
                        <h3>AI Diagnosis</h3>
                        <span className="status-text">{systemStatus.message}</span>
                    </div>
                    <div className="stat-card glass-panel">
                        <h3>Confidence</h3>
                        <span className="count">{(systemStatus.confidence * 100).toFixed(0)}%</span>
                    </div>
                </header>

                {/* Conditional View Rendering */}
                <div className="content-grid">

                    {/* VIEW: DASHBOARD & LIVE FEED (Shared for now) */}
                    {(activeView === 'dashboard' || activeView === 'live') && (
                        <>
                            <div className="video-section glass-panel">
                                <div className="panel-header">
                                    <h2><Camera size={20} /> Real-Time Analysis</h2>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <button
                                            onClick={toggleCamera}
                                            style={{
                                                background: cameraActive ? 'rgba(255, 50, 50, 0.2)' : 'rgba(50, 255, 50, 0.2)',
                                                border: cameraActive ? '1px solid #ff3333' : '1px solid #33ff33',
                                                color: cameraActive ? '#ff3333' : '#33ff33',
                                                padding: '5px 10px',
                                                borderRadius: '5px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold',
                                                fontSize: '0.8rem',
                                                fontFamily: 'var(--font-body)',
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            {cameraActive ? 'Stop Camera' : 'Start Camera'}
                                        </button>
                                        <span className="live-badge" style={{
                                            backgroundColor: getStatusColor(),
                                            opacity: cameraActive ? 1 : 0.5,
                                            animation: cameraActive && systemStatus.detected ? 'pulse Red 2s infinite' : 'none'
                                        }}>
                                            {cameraActive ? (systemStatus.detected ? "DETECTING" : "LIVE") : "OFFLINE"}
                                        </span>
                                    </div>
                                </div>
                                <div className="video-wrapper">
                                    <img
                                        src="http://localhost:5000/video_feed"
                                        alt="Live Feed"
                                    />

                                    {/* Overlay for Diagnosis */}
                                    {systemStatus.detected && (
                                        <div className="ai-overlay">
                                            <h3>AI ANALYSIS:</h3>
                                            <p className="big-text">{systemStatus.message}</p>
                                            <p className="sub-text">
                                                {systemStatus.severity === "High"
                                                    ? "RECOMMENDATION: EVACUATE / AUTO-SUPPRESSION"
                                                    : "RECOMMENDATION: MANUAL EXTINGUISHER OK"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="alerts-section glass-panel">
                                <div className="panel-header">
                                    <h2><AlertTriangle size={20} /> Incident Log</h2>
                                    <button className="clear-btn" onClick={() => setAlerts([])}>Clear</button>
                                </div>
                                <div className="alerts-list">
                                    {alerts.length === 0 ? <p className="no-data">No active threats.</p> : null}
                                    {alerts.map((alert, index) => (
                                        <div key={index} className={`alert-item ${alert.type}`}>
                                            <span className="timestamp">{alert.time}</span>
                                            <span className="message">{alert.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
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
                                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '15px' }}>
                                    <h3 style={{ marginBottom: '10px', color: '#ccc' }}>Geospatial Heatmap</h3>
                                    <AnalyticsMap events={analyticsData.events} />
                                    <div style={{ marginTop: '10px', display: 'flex', gap: '15px', fontSize: '0.8rem', color: '#aaa' }}>
                                        <span style={{ color: '#ff4d4d' }}>● High Severity (Red Zone)</span>
                                        <span style={{ color: '#ffa500' }}>● Medium Severity (Orange Zone)</span>
                                        <span style={{ color: '#4dff4d' }}>● Low Severity (Green Zone)</span>
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
                                            <span className="message">Detected at {event.latitude?.toFixed(4)}, {event.longitude?.toFixed(4)}</span>
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
