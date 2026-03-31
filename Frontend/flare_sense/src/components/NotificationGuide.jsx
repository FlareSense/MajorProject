import React from 'react';
import { Info, ExternalLink, MessageCircle, Send } from 'lucide-react';

const NotificationGuide = () => {
    return (
        <div className="glass-panel" style={{ padding: '24px', position: 'sticky', top: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '900' }}>
                <Info size={20} color="var(--accent-blue)" /> Setup Guides
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Twilio Card */}
                <div style={{
                    padding: '16px',
                    background: 'linear-gradient(145deg, rgba(242, 47, 70, 0.05) 0%, rgba(242, 47, 70, 0.01) 100%)',
                    border: '1px solid rgba(242, 47, 70, 0.15)',
                    borderRadius: '12px',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(242, 47, 70, 0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(242, 47, 70, 0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <MessageCircle size={18} color="#F22F46" />
                        <strong style={{ color: '#F22F46', fontSize: '1rem' }}>Twilio Core</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Log into your <a href="https://console.twilio.com/" target="_blank" rel="noreferrer" style={{ color: '#F22F46', textDecoration: 'none', fontWeight: 'bold' }}>Console <ExternalLink size={10} style={{verticalAlign:'baseline'}}/></a> to get your <b>SID</b>, <b>Auth Token</b>, and <b>Dispatch Number</b>. Enable Sandbox for WhatsApp testing.
                    </p>
                </div>

                {/* Telegram Card */}
                <div style={{
                    padding: '16px',
                    background: 'linear-gradient(145deg, rgba(34, 158, 217, 0.05) 0%, rgba(34, 158, 217, 0.01) 100%)',
                    border: '1px solid rgba(34, 158, 217, 0.15)',
                    borderRadius: '12px',
                    transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34, 158, 217, 0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(34, 158, 217, 0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Send size={18} color="#229ED9" />
                        <strong style={{ color: '#229ED9', fontSize: '1rem' }}>Telegram Bot</strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        Message <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" style={{ color: '#229ED9', textDecoration: 'none', fontWeight: 'bold' }}>@BotFather <ExternalLink size={10} style={{verticalAlign:'baseline'}}/></a> to create a bot & copy the <b>Token</b>. Forward a message to <a href="https://t.me/raw_data_bot" target="_blank" rel="noreferrer" style={{ color: '#229ED9', textDecoration: 'none', fontWeight: 'bold' }}>@raw_data_bot <ExternalLink size={10} style={{verticalAlign:'baseline'}}/></a> for your <b>Chat ID</b>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NotificationGuide;
