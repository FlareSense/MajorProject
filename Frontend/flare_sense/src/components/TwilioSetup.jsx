import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, SmartphoneNfc } from 'lucide-react';

const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 14px',
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-primary)',
    borderRadius: '8px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.3s ease',
    fontFamily: 'var(--font-body)',
};

const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
};

const TwilioSetup = ({ token }) => {
    const [config, setConfig] = useState({
        accountSid: '', authToken: '', fromNumber: '', toNumber: '',
        enableWhatsapp: false, telegramBotToken: '', telegramChatId: ''
    });
    const [status, setStatus] = useState({ type: '', msg: '' });

    useEffect(() => {
        fetch('http://localhost:8080/api/settings/twilio', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.status === 200 ? res.json() : null)
        .then(data => { if (data) setConfig(data); })
        .catch(err => console.error("Twilio fetch error", err));
    }, [token]);

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:8080/api/settings/twilio', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(config)
            });
            if (res.ok) {
                setStatus({ type: 'success', msg: 'Twilio Keys Locked in Local Vault.' });
            } else {
                setStatus({ type: 'error', msg: 'Failed to sync with API Gateway.' });
            }
        } catch (err) {
            setStatus({ type: 'error', msg: 'Connection to Java Core Failed.' });
        }
    };

    return (
        <div className="glass-panel" style={{ maxWidth: '640px', margin: '0 auto', gridColumn: '1 / -1' }}>
            {/* Header */}
            <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(0, 210, 255, 0.1)', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SmartphoneNfc size={22} color="var(--accent-blue)" />
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Notification Routing Setup</h2>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Link Twilio so fire alerts reach your phone securely.
                    </p>
                </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '20px 0' }} />

            {/* Status Banner */}
            {status.msg && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: status.type === 'success' ? 'rgba(5, 150, 105, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                    border: `1px solid ${status.type === 'success' ? 'rgba(5, 150, 105, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`,
                    color: status.type === 'success' ? 'var(--accent-green)' : 'var(--accent-red)',
                    fontSize: '0.9rem', fontWeight: '600'
                }}>
                    {status.type === 'success'
                        ? <CheckCircle size={18} />
                        : <AlertCircle size={18} />}
                    {status.msg}
                </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Twilio SID */}
                <div>
                    <label style={labelStyle}>Twilio Account SID</label>
                    <input
                        type="text"
                        value={config.accountSid}
                        onChange={e => setConfig({...config, accountSid: e.target.value})}
                        required
                        placeholder="AC..."
                        style={inputStyle}
                    />
                </div>

                {/* Twilio Token */}
                <div>
                    <label style={labelStyle}>Twilio Auth Token</label>
                    <input
                        type="password"
                        value={config.authToken}
                        onChange={e => setConfig({...config, authToken: e.target.value})}
                        required
                        style={inputStyle}
                    />
                </div>

                {/* From / To in a row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={labelStyle}>Dispatch Number (From)</label>
                        <input
                            type="text"
                            value={config.fromNumber}
                            placeholder="+1234567890"
                            onChange={e => setConfig({...config, fromNumber: e.target.value})}
                            required
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Target Number (To)</label>
                        <input
                            type="text"
                            value={config.toNumber}
                            placeholder="+0987654321"
                            onChange={e => setConfig({...config, toNumber: e.target.value})}
                            required
                            style={inputStyle}
                        />
                    </div>
                </div>

                {/* WhatsApp Toggle */}
                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: 'var(--accent-green)',
                    fontWeight: '700',
                    cursor: 'pointer',
                    padding: '10px 14px',
                    background: 'rgba(0, 255, 170, 0.05)',
                    border: '1px solid rgba(0, 255, 170, 0.2)',
                    borderRadius: '8px',
                }}>
                    <input
                        type="checkbox"
                        checked={config.enableWhatsapp}
                        onChange={e => setConfig({...config, enableWhatsapp: e.target.checked})}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent-green)', cursor: 'pointer' }}
                    />
                    Enable WhatsApp Sandbox Routing
                </label>

                <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '4px 0' }} />

                {/* Telegram */}
                <div>
                    <label style={labelStyle}>Telegram Bot Token (Optional)</label>
                    <input
                        type="password"
                        value={config.telegramBotToken}
                        placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                        onChange={e => setConfig({...config, telegramBotToken: e.target.value})}
                        style={inputStyle}
                    />
                </div>
                <div>
                    <label style={labelStyle}>Telegram Chat ID (Optional)</label>
                    <input
                        type="text"
                        value={config.telegramChatId}
                        placeholder="-1001234567890"
                        onChange={e => setConfig({...config, telegramChatId: e.target.value})}
                        style={inputStyle}
                    />
                </div>

                <button
                    type="submit"
                    className="vibrant-btn"
                    style={{ marginTop: '8px' }}
                >
                    SAVE DEPLOYMENT KEYS
                </button>
            </form>
        </div>
    );
};

export default TwilioSetup;
