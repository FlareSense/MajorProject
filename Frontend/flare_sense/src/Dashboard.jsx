
import React, { useState, useEffect } from 'react';
import { Flame, AlertTriangle, Activity, Camera, ShieldCheck, Thermometer, Map as MapIcon, Download, FileText } from 'lucide-react';
import AnalyticsMap from './components/AnalyticsMap';
import FireDetailsModal from './components/FireDetailsModal';

const Dashboard = () => {
    // Navigation State
    const [activeView, setActiveView] = useState('dashboard');
    const [selectedEventId, setSelectedEventId] = useState(null);

    // System Data State (Dictionary: { "0": {...}, "1": {...} })
    const [camerasStatus, setCamerasStatus] = useState({});

    // Aggregated Status for Header
    const [globalStatus, setGlobalStatus] = useState({
        maxSeverity: "None",
        totalFires: 0,
        message: "System Normal",
        avgConfidence: 0.0
    });

    const [alerts, setAlerts] = useState([]);
    const [analyticsData, setAnalyticsData] = useState(null);

    const toggleCamera = (camId, currentActive) => {
        const newState = !currentActive;
        // Optimistic update
        setCamerasStatus(prev => ({
            ...prev,
            [camId]: { ...prev[camId], active: newState }
        }));

        fetch('http://localhost:5000/api/camera/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: Number(camId), active: newState })
        }).catch(err => {
            console.error("Camera Toggle Error:", err);
            // Revert on error
            setCamerasStatus(prev => ({
                ...prev,
                [camId]: { ...prev[camId], active: !newState }
            }));
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
                    // data is { "0": {...}, "1": {...} }
                    setCamerasStatus(data);

                    // Aggregate Data for Header
                    let maxSev = "None";
                    let fireCount = 0;
                    let totalConf = 0;
                    let activeCams = 0;
                    let newMessage = "System Normal";

                    Object.entries(data).forEach(([id, status]) => {
                        if (status.detected) {
                            fireCount++;
                            totalConf += status.confidence;
                            if (status.severity === "High") maxSev = "High";
                            else if (status.severity === "Medium" && maxSev !== "High") maxSev = "Medium";
                            else if (status.severity === "Low" && maxSev === "None") maxSev = "Low";

                            newMessage = status.message; // Use last message

                            // Add Local Alert
                            const newAlert = {
                                id: Date.now() + Math.random(), // Unique ID
                                time: new Date().toLocaleTimeString(),
                                message: `[CAM ${id}] ${status.message}`,
                                type: status.severity === "High" ? 'critical' : 'warning'
                            };

                            setAlerts(prev => {
                                const last = prev[0];
                                // Avoid spamming: Check if same message sent recently
                                if (!last || (Date.now() - (last.timestamp || 0) > 5000) || last.message !== newAlert.message) {
                                    newAlert.timestamp = Date.now();
                                    return [newAlert, ...prev].slice(0, 50);
                                }
                                return prev;
                            });
                        }
                        if (status.active) activeCams++;
                    });

                    setGlobalStatus({
                        maxSeverity: maxSev,
                        totalFires: fireCount,
                        message: fireCount > 0 ? `WARNING: ${fireCount} Active Threats!` : "System Normal",
                        avgConfidence: fireCount > 0 ? (totalConf / fireCount) : 0.0
                    });

                })
                .catch(err => console.error("API Error:", err));
        }, 1000); // Check every second

        return () => clearInterval(interval);
    }, [activeView]);

    // Helper to determine global status color
    const getGlobalStatusColor = () => {
        if (globalStatus.totalFires === 0) return "#4dff4d"; // Green
        if (globalStatus.maxSeverity === "High") return "#ff4d4d"; // Red
        return "#ffa500"; // Orange
    };

    const handleFileUpload = (event, camId) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('id', camId);

        fetch('http://localhost:5000/api/camera/config', {
            method: 'POST',
            body: formData
        })
            .then(res => res.json())
            .then(data => {
                console.log("Upload success:", data);
                alert(`Source updated for Camera ${camId}`);
            })
            .catch(err => {
                console.error("Upload error:", err);
                alert("Failed to upload video.");
            });
    };

    return (
        <div className="dashboard-container">
            {/* Sidebar / Navigation */}
            <nav className="glass-nav">
                <div className="logo">
                    <Flame color={getGlobalStatusColor()} size={32} />
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
                    <ShieldCheck size={20} color={getGlobalStatusColor()} />
                    <span>{globalStatus.totalFires > 0 ? "THREAT DETECTED" : "Secure"}</span>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="main-content">

                {/* Header Stats - Always Visible */}
                <header className="stats-grid">
                    <div className="stat-card glass-panel">
                        <h3>Fire Intensity</h3>
                        <span className={`count ${globalStatus.maxSeverity === 'High' ? 'critical' : ''}`}>
                            {globalStatus.maxSeverity}
                        </span>
                    </div>
                    <div className="stat-card glass-panel">
                        <h3>AI Diagnosis</h3>
                        <span className="status-text">{globalStatus.message}</span>
                    </div>
                    <div className="stat-card glass-panel">
                        <h3>Avg Confidence</h3>
                        <span className="count">{(globalStatus.avgConfidence * 100).toFixed(0)}%</span>
                    </div>
                </header>

                {/* Conditional View Rendering */}
                <div className="content-grid">

                    {/* VIEW: DASHBOARD & LIVE FEED */}
                    {(activeView === 'dashboard' || activeView === 'live') && (
                        <>
                            {/* MULTI-CAMERA GRID */}
                            <div className="video-section glass-panel" style={{ gridColumn: '1 / -1' }}>
                                <div className="panel-header">
                                    <h2><Camera size={20} /> Multi-Camera Analysis</h2>
                                </div>

                                <div className="camera-grid" style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                                    gap: '20px',
                                    width: '100%'
                                }}>
                                    {Object.entries(camerasStatus).map(([id, status]) => (
                                        <div key={id} className="camera-feed-card" style={{
                                            background: 'rgba(0,0,0,0.3)',
                                            borderRadius: '10px',
                                            overflow: 'hidden',
                                            border: status.detected ? (status.severity === 'High' ? '2px solid red' : '2px solid orange') : '1px solid #333'
                                        }}>
                                            <div className="cam-header" style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)' }}>
                                                <span style={{ fontWeight: 'bold' }}>CAM {id} <small style={{ color: '#aaa' }}>({status.location})</small></span>
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                    {/* Upload Button */}
                                                    <label style={{
                                                        background: 'rgba(255, 255, 255, 0.1)',
                                                        border: '1px solid #aaa',
                                                        color: '#ddd',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.7rem'
                                                    }}>
                                                        UPLOAD
                                                        <input
                                                            type="file"
                                                            accept="video/*"
                                                            style={{ display: 'none' }}
                                                            onChange={(e) => handleFileUpload(e, id)}
                                                        />
                                                    </label>

                                                    <button
                                                        onClick={() => toggleCamera(id, status.active)}
                                                        style={{
                                                            background: status.active ? 'rgba(255, 50, 50, 0.2)' : 'rgba(50, 255, 50, 0.2)',
                                                            border: status.active ? '1px solid #ff3333' : '1px solid #33ff33',
                                                            color: status.active ? '#ff3333' : '#33ff33',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.7rem'
                                                        }}
                                                    >
                                                        {status.active ? 'STOP' : 'START'}
                                                    </button>
                                                </div>
                                            </div>

                                            <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3' }}>
                                                <img
                                                    src={`http://localhost:5000/video_feed/${id}`}
                                                    alt={`Cam ${id}`}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => { e.target.style.display = 'none' }}
                                                />
                                                {!status.active && (
                                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                                                        <span style={{ color: '#555' }}>CAMERA DISABLED</span>
                                                    </div>
                                                )}

                                                {/* Overlay */}
                                                {status.detected && status.active && (
                                                    <div className="ai-overlay" style={{ padding: '10px' }}>
                                                        <p className="big-text" style={{ fontSize: '1rem' }}>{status.message}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {Object.keys(camerasStatus).length === 0 && (
                                        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                            Loading Cameras...
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="alerts-section glass-panel" style={{ gridColumn: '1 / -1' }}>
                                <div className="panel-header">
                                    <h2><AlertTriangle size={20} /> Global Incident Log</h2>
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
