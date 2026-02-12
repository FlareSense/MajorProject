import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, MapPin, AlertTriangle, Activity, Calendar } from 'lucide-react';

const FireDetailsModal = ({ eventId, onClose }) => {
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (eventId) {
            setLoading(true);
            fetch(`http://localhost:5000/api/event/${eventId}`)
                .then(res => res.json())
                .then(data => {
                    setEvent(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to load event:", err);
                    setLoading(false);
                });
        }
    }, [eventId]);

    if (!eventId) return null;

    return (
        <AnimatePresence>
            <div className="modal-overlay" style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(5px)',
                display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="glass-panel"
                    style={{ width: '90%', maxWidth: '800px', padding: '2rem', borderRadius: '20px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
                >
                    <button
                        onClick={onClose}
                        style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                    >
                        <X size={24} />
                    </button>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '50px' }}>Loading Details...</div>
                    ) : event ? (
                        <div className="modal-content">
                            <h2 style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                                🔥 Fire Incident Report #{event.id}
                            </h2>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {/* Left Column: Image */}
                                <div>
                                    <div style={{
                                        width: '100%', height: '300px', borderRadius: '15px', overflow: 'hidden',
                                        border: '2px solid rgba(255, 255, 255, 0.2)', marginBottom: '15px'
                                    }}>
                                        <img
                                            src={`http://localhost:5000/${event.image_path}`}
                                            alt="Fire Detection Evidence"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found'; }}
                                        />
                                    </div>
                                </div>

                                {/* Right Column: Details */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div className="stat-row">
                                        <Calendar size={18} color="#aaa" />
                                        <span>Timestamp: <strong>{new Date(event.timestamp).toLocaleString()}</strong></span>
                                    </div>
                                    <div className="stat-row">
                                        <AlertTriangle size={18} color={event.severity === 'HIGH' ? '#ff4d4d' : '#ffa500'} />
                                        <span>Severity: <strong style={{ color: event.severity === 'HIGH' ? '#ff4d4d' : '#ffa500' }}>{event.severity}</strong></span>
                                    </div>
                                    <div className="stat-row">
                                        <Activity size={18} color="#4dff4d" />
                                        <span>Confidence: <strong>{(event.confidence * 100).toFixed(1)}%</strong></span>
                                    </div>
                                    <div className="stat-row">
                                        <MapPin size={18} color="#00aaff" />
                                        <span>Location: <strong>{event.latitude?.toFixed(4)}, {event.longitude?.toFixed(4)}</strong></span>
                                    </div>
                                    <div className="stat-row">
                                        <span>Zone Classification: <strong style={{ color: event.severity === 'HIGH' ? '#ff4d4d' : 'orange' }}>{event.zone || 'Unclassified'}</strong></span>
                                    </div>

                                    <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => window.open(event.location_url, '_blank')}
                                            className="action-btn"
                                            style={{ flex: 1, padding: '10px', background: 'rgba(0, 170, 255, 0.2)', border: '1px solid #00aaff', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            <MapPin size={16} style={{ marginBottom: '-2px', marginRight: '5px' }} /> View on Map
                                        </button>
                                        <button
                                            onClick={() => window.print()}
                                            className="action-btn"
                                            style={{ flex: 1, padding: '10px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid #fff', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            <Download size={16} style={{ marginBottom: '-2px', marginRight: '5px' }} /> Print Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#ff4d4d' }}>Failed to load event data.</div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default FireDetailsModal;
