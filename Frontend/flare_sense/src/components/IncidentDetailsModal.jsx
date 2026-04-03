import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, Activity, MapPin, Calendar, Shield, Zap, Image, CheckCircle2, XCircle } from 'lucide-react';

const SEV_CONFIG = {
    HIGH:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'HIGH',   glow: 'rgba(239,68,68,0.3)'   },
    MEDIUM: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'MEDIUM', glow: 'rgba(245,158,11,0.3)' },
    LOW:    { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'LOW',    glow: 'rgba(34,197,94,0.3)'   },
};

/**
 * The DB stores imagePath as whatever was sent by the Python server:
 *   - A full CDN URL  (https://...)
 *   - A local URL     (http://127.0.0.1:5000/evidence/fire_xxx.jpg)
 *   - A relative path (evidence/fire_xxx.jpg)
 *   - Just a filename (fire_xxx.jpg)
 * This helper normalises all cases to a usable src URL.
 */
function resolveImageUrl(imagePath) {
    if (!imagePath) return null;
    // Already a full URL
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        // Swap 127.0.0.1 → localhost so the browser can reach it
        return imagePath.replace('http://127.0.0.1:5000', 'http://localhost:5000');
    }
    // Relative path like "evidence/fire_xxx.jpg" or just "fire_xxx.jpg"
    const filename = imagePath.split('/').pop().split('\\').pop();
    return `http://localhost:5000/evidence/${filename}`;
}

const IncidentDetailsModal = ({ eventId, token, onClose }) => {
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        if (!eventId) return;
        setLoading(true);
        setError(null);
        setImgError(false);
        fetch(`http://localhost:8080/api/analytics/events/${eventId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error('Event not found');
                return res.json();
            })
            .then(data => { setEvent(data); setLoading(false); })
            .catch(err => { setError(err.message); setLoading(false); });
    }, [eventId, token]);

    if (!eventId) return null;

    const sev = event ? (SEV_CONFIG[event.severity] || SEV_CONFIG.LOW) : null;

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '20px',
                animation: 'slideUpFade 0.25s ease-out',
            }}
        >
            <div style={{
                width: '100%', maxWidth: '780px',
                background: 'var(--panel-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '24px',
                position: 'relative',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6), inset 0 1px 0 var(--glass-highlight)',
                backdropFilter: 'blur(30px)',
            }}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '20px', right: '20px', zIndex: 10,
                        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                        color: 'var(--text-secondary)', width: '36px', height: '36px',
                        borderRadius: '10px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-red)'; e.currentTarget.style.borderColor = 'var(--accent-red)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
                >
                    <X size={18} />
                </button>

                {loading ? (
                    <div style={{ padding: '80px 40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>
                            Fetching incident data...
                        </div>
                    </div>
                ) : error ? (
                    <div style={{ padding: '80px 40px', textAlign: 'center' }}>
                        <XCircle size={40} color="var(--accent-red)" style={{ marginBottom: '12px', opacity: 0.7 }} />
                        <div style={{ color: 'var(--accent-red)', fontWeight: '700' }}>Failed to load incident</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px' }}>{error}</div>
                    </div>
                ) : event && (
                    <>
                        {/* Header Band */}
                        <div style={{
                            padding: '28px 32px 24px',
                            borderBottom: '1px solid var(--glass-border)',
                            background: sev.bg,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '14px',
                                    background: sev.bg, border: `1px solid ${sev.color}40`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: `0 0 20px ${sev.glow}`,
                                }}>
                                    <AlertTriangle size={24} color={sev.color} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                                        🔥 Fire Incident Report
                                        <span style={{ marginLeft: '10px', fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '700' }}>
                                            #{event.id}
                                        </span>
                                    </h2>
                                    <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{
                                            fontSize: '0.68rem', fontWeight: '900', letterSpacing: '1px',
                                            textTransform: 'uppercase', padding: '3px 10px', borderRadius: '99px',
                                            background: sev.bg, color: sev.color, border: `1px solid ${sev.color}40`,
                                        }}>
                                            {sev.label} SEVERITY
                                        </span>
                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                            {new Date(event.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>

                            {/* LEFT: Snapshot */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Image size={13} /> Evidence Snapshot
                                </div>
                                <div style={{
                                    width: '100%', aspectRatio: '16/10', borderRadius: '14px',
                                    overflow: 'hidden', border: `1px solid ${sev.color}40`,
                                    background: 'var(--glass-bg)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    position: 'relative', boxShadow: `0 0 30px ${sev.glow}`,
                                }}>
                                    {imgError ? (
                                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                                            <Image size={36} style={{ opacity: 0.3, marginBottom: '10px' }} />
                                            <div style={{ fontSize: '0.82rem' }}>No image available</div>
                                        </div>
                                    ) : (
                                        <img
                                            src={resolveImageUrl(event.imagePath)}
                                            alt="Fire Detection Evidence"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={() => setImgError(true)}
                                        />
                                    )}
                                </div>
                                {/* Alert Sent Badge */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '12px 16px', borderRadius: '12px',
                                    background: event.alertSent ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                                    border: `1px solid ${event.alertSent ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                }}>
                                    {event.alertSent
                                        ? <CheckCircle2 size={18} color="#22c55e" />
                                        : <XCircle size={18} color="#ef4444" />
                                    }
                                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: event.alertSent ? '#22c55e' : '#ef4444' }}>
                                        {event.alertSent ? 'Alerts dispatched to all residents' : 'No alert was sent'}
                                    </span>
                                </div>
                            </div>

                            {/* RIGHT: Details Grid */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Shield size={13} /> Incident Details
                                </div>

                                {[
                                    {
                                        icon: <Calendar size={16} color="var(--accent-blue)" />,
                                        label: 'Timestamp',
                                        value: new Date(event.timestamp).toLocaleString(),
                                    },
                                    {
                                        icon: <AlertTriangle size={16} color={sev.color} />,
                                        label: 'Severity',
                                        value: <span style={{ color: sev.color, fontWeight: '900' }}>{event.severity}</span>,
                                    },
                                    {
                                        icon: <Activity size={16} color="var(--accent-green)" />,
                                        label: 'AI Confidence',
                                        value: (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontWeight: '900', color: 'var(--accent-green)' }}>
                                                    {((event.confidence || 0) * 100).toFixed(1)}%
                                                </span>
                                                <div style={{ flex: 1, height: '6px', borderRadius: '99px', background: 'var(--glass-border)', overflow: 'hidden' }}>
                                                    <div style={{
                                                        height: '100%', borderRadius: '99px',
                                                        background: 'var(--accent-green)',
                                                        width: `${(event.confidence || 0) * 100}%`,
                                                        transition: 'width 0.8s ease',
                                                    }} />
                                                </div>
                                            </div>
                                        ),
                                    },
                                    {
                                        icon: <Zap size={16} color="#f59e0b" />,
                                        label: 'Chaos Score',
                                        value: (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontWeight: '900', color: '#f59e0b' }}>
                                                    {((event.chaosScore || 0) * 100).toFixed(1)}%
                                                </span>
                                                <div style={{ flex: 1, height: '6px', borderRadius: '99px', background: 'var(--glass-border)', overflow: 'hidden' }}>
                                                    <div style={{
                                                        height: '100%', borderRadius: '99px',
                                                        background: '#f59e0b',
                                                        width: `${(event.chaosScore || 0) * 100}%`,
                                                        transition: 'width 0.8s ease',
                                                    }} />
                                                </div>
                                            </div>
                                        ),
                                    },
                                    {
                                        icon: <Shield size={16} color="var(--accent-blue)" />,
                                        label: 'Zone',
                                        value: <span style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{event.zone || 'Unclassified'}</span>,
                                    },
                                    {
                                        icon: <MapPin size={16} color="var(--accent-red)" />,
                                        label: 'GPS Coordinates',
                                        value: event.latitude
                                            ? `${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)}`
                                            : 'Not available',
                                    },
                                ].map(({ icon, label, value }) => (
                                    <div key={label} style={{
                                        padding: '14px 16px', borderRadius: '12px',
                                        background: 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)',
                                        display: 'flex', flexDirection: 'column', gap: '6px',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {icon}
                                            <span style={{ fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>
                                                {label}
                                            </span>
                                        </div>
                                        <div style={{ paddingLeft: '24px', fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: '600' }}>
                                            {value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div style={{
                            padding: '20px 32px', borderTop: '1px solid var(--glass-border)',
                            display: 'flex', gap: '12px', justifyContent: 'flex-end',
                            background: 'var(--glass-bg)',
                            borderRadius: '0 0 24px 24px',
                        }}>
                            {event.locationUrl && (
                                <button
                                    onClick={() => window.open(event.locationUrl, '_blank')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '10px 20px', borderRadius: '10px', cursor: 'pointer',
                                        background: 'rgba(0,210,255,0.1)', border: '1px solid rgba(0,210,255,0.3)',
                                        color: 'var(--accent-blue)', fontWeight: '700', fontSize: '0.85rem',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,210,255,0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,210,255,0.1)'}
                                >
                                    <MapPin size={15} /> View on Map
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '10px 24px', borderRadius: '10px', cursor: 'pointer',
                                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                                    color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.85rem',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-secondary)'; }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--glass-border)'; }}
                            >
                                Close
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default IncidentDetailsModal;
