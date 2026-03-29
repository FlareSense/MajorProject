import React, { useState, useEffect } from 'react';
import { CheckCircle, SmartphoneNfc } from 'lucide-react';

const TwilioSetup = ({ token }) => {
    const [config, setConfig] = useState({ accountSid: '', authToken: '', fromNumber: '', toNumber: '', enableWhatsapp: false, telegramBotToken: '', telegramChatId: '' });
    const [status, setStatus] = useState({ type: '', msg: '' });

    useEffect(() => {
        fetch('http://localhost:8080/api/settings/twilio', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.status === 200 ? res.json() : null)
        .then(data => {
            if (data) setConfig(data);
        })
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
        <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', gridColumn: '1 / -1' }}>
            <h2><SmartphoneNfc size={24} style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Notification Routing Setup</h2>
            <p style={{ color: '#aaa' }}>Link your personal Twilio account so that structural fire alerts can bypass public gateways and hit your phone securely.</p>
            
            {status.msg && (
                <div style={{ padding: '15px', borderRadius: '8px', marginBottom: '20px', background: status.type === 'success' ? 'rgba(50,255,50,0.1)' : 'rgba(255,50,50,0.1)', color: status.type === 'success' ? '#4dff4d' : '#ff4d4d' }}>
                    {status.type === 'success' && <CheckCircle size={18} style={{ verticalAlign: 'middle', marginRight: '5px' }} />}
                    {status.msg}
                </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#eee' }}>Twilio Account SID</label>
                    <input type="text" value={config.accountSid} onChange={e => setConfig({...config, accountSid: e.target.value})} required style={{ width: '100%', boxSizing: 'border-box', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '5px' }} />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#eee' }}>Twilio Auth Token</label>
                    <input type="password" value={config.authToken} onChange={e => setConfig({...config, authToken: e.target.value})} required style={{ width: '100%', boxSizing: 'border-box', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '5px' }} />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#eee' }}>Twilio Dispatch Number (From)</label>
                    <input type="text" value={config.fromNumber} placeholder="+1234567890" onChange={e => setConfig({...config, fromNumber: e.target.value})} required style={{ width: '100%', boxSizing: 'border-box', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '5px' }} />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#eee' }}>Target Operator Number (To)</label>
                    <input type="text" value={config.toNumber} placeholder="+0987654321" onChange={e => setConfig({...config, toNumber: e.target.value})} required style={{ width: '100%', boxSizing: 'border-box', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '5px' }} />
                </div>
                <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4dff4d', fontWeight: 'bold' }}>
                        <input type="checkbox" checked={config.enableWhatsapp} onChange={e => setConfig({...config, enableWhatsapp: e.target.checked})} style={{ transform: 'scale(1.5)' }} />
                        Enable WhatsApp Sandbox Routing
                    </label>
                </div>
                <hr style={{ border: '1px solid rgba(255,255,255,0.1)', margin: '10px 0' }} />
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#eee' }}>Telegram Bot Token (Optional)</label>
                    <input type="password" value={config.telegramBotToken} placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" onChange={e => setConfig({...config, telegramBotToken: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '5px' }} />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', color: '#eee' }}>Telegram Chat ID (Optional)</label>
                    <input type="text" value={config.telegramChatId} placeholder="-1001234567890" onChange={e => setConfig({...config, telegramChatId: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '5px' }} />
                </div>
                <button type="submit" style={{ background: '#00aaff', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px' }}>
                    SAVE DEPLOYMENT KEYS
                </button>
            </form>
        </div>
    );
};
export default TwilioSetup;
