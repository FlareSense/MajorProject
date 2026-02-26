import React, { useState, useEffect } from 'react';
import { Flame, AlertTriangle, Activity, Camera, ShieldCheck, Thermometer, Users, Box, Map as MapIcon, Download } from 'lucide-react';
import SpatialMap from './SpatialMap';
import AnalyticsMap from './components/AnalyticsMap';
import FireDetailsModal from './components/FireDetailsModal';

const Dashboard = () => {
    // Navigation State
    const [activeView, setActiveView] = useState('dashboard');

    // System Data State
    const [cameras, setCameras] = useState({});
    const [systemStatus, setSystemStatus] = useState({});

    const [alerts, setAlerts] = useState([]);

    // Analytics State
    const [analyticsData, setAnalyticsData] = useState(null);
    const [selectedEventId, setSelectedEventId] = useState(null);

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
                <div className="logo">
                    <Flame color={getOverallStatusColor()} size={32} />
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
                        className={activeView === '3d_map' ? 'active' : ''}
                        onClick={() => setActiveView('3d_map')}
                    >
                        <Box size={20} /> 3D Digital Twin
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
                    <ShieldCheck size={20} color={getOverallStatusColor()} />
                    <span>{isAnyThreatDetected ? (isAnyEvacuationNeeded ? "EVACUATION PROTOCOL" : "THREAT DETECTED") : "Secure"}</span>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="main-content" style={{ overflowY: 'auto' }}>

                {/* Conditional View Rendering */}
                <div className="content-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* VIEW: DASHBOARD & LIVE FEED */}
                    {(activeView === 'dashboard' || activeView === 'live') && (
                        <>
                            <div className="alerts-section glass-panel" style={{ width: '100%' }}>
                                <div className="panel-header">
                                    <h2><AlertTriangle size={20} /> Global Incident Log</h2>
                                    <button className="clear-btn" onClick={() => setAlerts([])}>Clear</button>
                                </div>
                                <div className="alerts-list">
                                    {alerts.length === 0 ? <p className="no-data">No active threats across all zones.</p> : null}
                                    {alerts.map((alert, index) => (
                                        <div key={index} className={`alert-item ${alert.type}`} style={{
                                            borderLeft: alert.type === 'critical-evacuee' ? '4px solid #ff00ff' : '',
                                            backgroundColor: alert.type === 'critical-evacuee' ? 'rgba(255, 0, 255, 0.1)' : ''
                                        }}>
                                            <span className="timestamp">{alert.time}</span>
                                            <span className="message">{alert.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                                {Object.keys(cameras).map(camId => {
                                    const camInfo = cameras[camId];
                                    const status = systemStatus[camId] || {};
                                    const isCamActive = status.camera_active !== false;

                                    return (
                                        <div key={camId} className="video-section glass-panel" style={{
                                            border: status.evacuation_needed ? '2px solid #ff00ff' : '1px solid rgba(255, 255, 255, 0.1)'
                                        }}>
                                            <div className="panel-header">
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <h2><Camera size={20} /> {camInfo.name} Live Feed</h2>
                                                    {status.person_count > 0 && (
                                                        <span style={{ fontSize: '0.8rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                            <Users size={14} /> People in Zone: {status.person_count}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                    <button
                                                        onClick={() => toggleCamera(camId)}
                                                        style={{
                                                            background: isCamActive ? 'rgba(255, 50, 50, 0.2)' : 'rgba(50, 255, 50, 0.2)',
                                                            border: isCamActive ? '1px solid #ff3333' : '1px solid #33ff33',
                                                            color: isCamActive ? '#ff3333' : '#33ff33',
                                                            padding: '5px 10px',
                                                            borderRadius: '5px',
                                                            cursor: 'pointer',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.8rem',
                                                            fontFamily: 'var(--font-body)',
                                                            textTransform: 'uppercase'
                                                        }}
                                                    >
                                                        {isCamActive ? 'Stop' : 'Start'}
                                                    </button>
                                                    <span className="live-badge" style={{
                                                        backgroundColor: getCamStatusColor(status),
                                                        opacity: isCamActive ? 1 : 0.5,
                                                        animation: isCamActive && status.detected ? 'pulse Red 2s infinite' : 'none'
                                                    }}>
                                                        {isCamActive ? (status.evacuation_needed ? "EVACUATE" : (status.detected ? "DETECTING" : "LIVE")) : "OFFLINE"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="video-wrapper">
                                                <img
                                                    src={`http://localhost:5000/video_feed/${camId}`}
                                                    alt={`Live Feed ${camInfo.name}`}
                                                    style={{ width: '100%', borderRadius: '10px' }}
                                                />

                                                {/* Overlay for Diagnosis */}
                                                {status.detected && isCamActive && (
                                                    <div className="ai-overlay" style={{
                                                        background: status.evacuation_needed ? 'rgba(255,0,255,0.2)' : 'rgba(0,0,0,0.7)',
                                                        backdropFilter: 'blur(5px)',
                                                        border: status.evacuation_needed ? '2px solid #ff00ff' : 'none',
                                                        padding: '10px', borderRadius: '5px', marginTop: '10px', position: 'absolute', bottom: '10px', left: '10px', right: '10px'
                                                    }}>
                                                        <h3 style={{ margin: 0, color: status.evacuation_needed ? '#ff00ff' : '#ff4d4d' }}>
                                                            {status.evacuation_needed ? '⚠️ CRITICAL EVACUATION WARNING ⚠️' : 'AI ANALYSIS:'}
                                                        </h3>
                                                        <p className="big-text" style={{ margin: '5px 0', fontSize: status.evacuation_needed ? '1.2rem' : '1rem' }}>
                                                            {status.message}
                                                        </p>
                                                        <p className="sub-text" style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                            {status.evacuation_needed
                                                                ? `IMMEDIATE DANGER TO ${status.person_count} PERSON(S). DISPATCH RESCUE.`
                                                                : (status.severity === "High"
                                                                    ? "RECOMMENDATION: EVACUATE / AUTO-SUPPRESSION"
                                                                    : "RECOMMENDATION: MANUAL EXTINGUISHER OK")}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}

                    {/* VIEW: 3D MAP */}
                    {activeView === '3d_map' && (
                        <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '0px' }}>
                            <SpatialMap systemStatus={systemStatus} cameras={cameras} />
                        </div>
                    )}

                    {/* VIEW: HISTORY */}
                    {activeView === 'history' && (
                        <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
                            <h2><Thermometer size={20} /> Extensive Incident History</h2>
                            <p>Full database logs would appear here.</p>
                            <div className="alerts-list" style={{ marginTop: '20px' }}>
                                {alerts.map((alert, index) => (
                                    <div key={index} className={`alert-item ${alert.type}`}>
                                        <span className="timestamp">{alert.time}</span>
                                        <span className="message">{alert.message} - {alert.type.toUpperCase()}</span>
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
