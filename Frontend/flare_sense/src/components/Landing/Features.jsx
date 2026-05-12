import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Bell, ShieldAlert, Cpu } from 'lucide-react';

const Features = () => {
    const features = [
        {
            icon: Camera,
            title: "CCTV AI Integration",
            description: "Connects with existing RTSP IP cameras and webcams to process live video feeds at 30+ FPS without needing proprietary hardware."
        },
        {
            icon: Cpu,
            title: "Sub-second YOLOv11 Inference",
            description: "Custom-trained AI model detects thermal blooming and particulate smoke strings faster than standard ceiling detectors."
        },
        {
            icon: Bell,
            title: "Instant Multi-channel Alerts",
            description: "Dispatches SMS, Telegram, WhatsApp, and Emails to all registered residents within milliseconds of verification."
        },
        {
            icon: ShieldAlert,
            title: "Automated Audio Alarms",
            description: "Triggers on-site localized audio sirens dynamically based on severity and evacuation protocols."
        }
    ];

    return (
        <section id="features" className="py-24 bg-[var(--bg-color)] relative z-10 px-6 transition-colors duration-500">
            <div className="max-w-6xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4">Unmatched Protection Features</h2>
                    <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto">State-of-the-art technology monitoring your premises 24/7 without fatigue.</p>
                </motion.div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {features.map((entry, idx) => (
                        <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-50px" }}
                            transition={{ duration: 0.6, delay: idx * 0.15, ease: "easeOut" }}
                            className="p-8 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-highlight)] backdrop-blur-sm transition-colors group"
                        >
                            <div className="w-14 h-14 rounded-xl bg-orange-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <entry.icon size={28} className="text-orange-400" />
                            </div>
                            <h3 className="text-2xl font-semibold text-[var(--text-primary)] mb-3">{entry.title}</h3>
                            <p className="text-[var(--text-secondary)] leading-relaxed">{entry.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
