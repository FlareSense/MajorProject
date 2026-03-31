import React, { useState } from 'react';
import { Mail, Phone, MapPin, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const Contact = () => {
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [status, setStatus] = useState(null); // 'success', 'error', null
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic Validation
        if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
            setStatus('error');
            setErrorMsg('All fields are required.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setStatus('error');
            setErrorMsg('Please enter a valid email address.');
            return;
        }

        setLoading(true);
        setStatus(null);

        try {
            const res = await fetch('http://localhost:8080/api/contact/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setFormData({ name: '', email: '', message: '' }); // clear form
            } else {
                setStatus('error');
                setErrorMsg(data.message || 'Failed to submit inquiry.');
            }
        } catch (err) {
            setStatus('error');
            setErrorMsg('Cannot reach backend server. Please ensure FlareSense Gateway is running.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="contact" className="py-24 bg-[var(--bg-color)]/95 border-t border-[var(--glass-border)] relative z-10 px-6 transition-colors duration-500">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div>
                    <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-6">Let's Get Connected</h2>
                    <p className="text-[var(--text-secondary)] text-lg mb-10 leading-relaxed font-light">
                        Ready to integrate cutting-edge fire AI scanning into your existing CCTV network? Reach out to our team to request a demo or explore deployment options.
                    </p>
                    <div className="space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-[var(--glass-bg)] rounded-full text-[var(--text-primary)]/80 border border-[var(--glass-border)] transition-colors">
                                <Mail size={24} />
                            </div>
                            <div>
                                <h4 className="text-[var(--text-primary)] font-medium">Email Us</h4>
                                <span className="text-[var(--text-secondary)]/50 text-sm">codewithpavan29@gmail.com</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-[var(--glass-bg)] rounded-full text-[var(--text-primary)]/80 border border-[var(--glass-border)] transition-colors">
                                <Phone size={24} />
                            </div>
                            <div>
                                <h4 className="text-[var(--text-primary)] font-medium">Call Us</h4>
                                <span className="text-[var(--text-secondary)]/50 text-sm">8790102300</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-[var(--glass-bg)] rounded-full text-[var(--text-primary)]/80 border border-[var(--glass-border)] transition-colors">
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h4 className="text-[var(--text-primary)] font-medium">Office</h4>
                                <span className="text-[var(--text-secondary)]/50 text-sm">Langer Houz Hyderabad</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-8 lg:p-12 backdrop-blur-md transition-colors">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {status === 'success' && (
                            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl">
                                <CheckCircle2 size={20} />
                                <span className="font-medium text-sm">Inquiry sent successfully! We will contact you shortly.</span>
                            </div>
                        )}
                        
                        {status === 'error' && (
                            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                                <AlertCircle size={20} />
                                <span className="font-medium text-sm">{errorMsg}</span>
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-semibold text-[var(--text-secondary)]/60 mb-2 block uppercase tracking-wider">Full Name</label>
                            <input 
                                type="text" 
                                className="w-full bg-[var(--bg-color)]/5 border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-blue-500 transition-colors" 
                                placeholder="John Doe" 
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-[var(--text-secondary)]/60 mb-2 block uppercase tracking-wider">Email Address</label>
                            <input 
                                type="email" 
                                className="w-full bg-[var(--bg-color)]/5 border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-blue-500 transition-colors" 
                                placeholder="johndoe@example.com" 
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-[var(--text-secondary)]/60 mb-2 block uppercase tracking-wider">Message</label>
                            <textarea 
                                rows="4" 
                                className="w-full bg-[var(--bg-color)]/5 border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-blue-500 transition-colors resize-none" 
                                placeholder="How can we help you protect your assets?"
                                value={formData.message}
                                onChange={(e) => setFormData({...formData, message: e.target.value})}
                                disabled={loading}
                            ></textarea>
                        </div>
                        <button 
                            type="submit"
                            disabled={loading}
                            className={`w-full flex justify-center items-center gap-2 text-white font-semibold rounded-xl py-4 transition-all ${loading ? 'bg-white/10 cursor-not-allowed text-white/50' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90'}`}
                        >
                            {loading ? <><Loader2 size={20} className="animate-spin" /> Sending...</> : 'Send Request'}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
};

export default Contact;
