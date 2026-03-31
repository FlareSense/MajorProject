import React from 'react';

const Insights = () => {
    return (
        <section id="insights" className="py-24 bg-[var(--bg-color)]/95 relative z-10 px-6 border-y border-[var(--glass-border)] transition-colors duration-500">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12 items-center">
                <div className="flex-1">
                    <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-6">AI Insights and Intelligent Analytics</h2>
                    <p className="text-[var(--text-secondary)] text-lg mb-6 leading-relaxed">
                        Traditional detectors only activate when smoke reaches the ceiling, delaying response times by 5-10 minutes.
                        Our geospatial mapping and video heatmaps allow first responders to instantly understand the danger zones,
                        providing up to an 85% shorter intervention window.
                    </p>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="border-l-4 border-orange-500 pl-4 py-2">
                            <span className="block text-4xl font-black text-[var(--text-primary)]">4M+</span>
                            <span className="text-sm text-[var(--text-secondary)]/50 uppercase tracking-widest font-semibold mt-1">Hectares Saved</span>
                        </div>
                        <div className="border-l-4 border-red-500 pl-4 py-2">
                            <span className="block text-4xl font-black text-[var(--text-primary)]">&lt;1s</span>
                            <span className="text-sm text-[var(--text-secondary)]/50 uppercase tracking-widest font-semibold mt-1">Detection Time</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl p-8 backdrop-blur-md relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[50px] rounded-full pointer-events-none" />
                    <blockquote className="text-2xl font-light italic text-[var(--text-primary)]/90 relative z-10">
                        "Flare Sense doesn't just watch—it acts. We intercept emergencies at the point of origin, turning catastrophic events into managed incidents."
                    </blockquote>
                    <p className="mt-6 text-sm text-[var(--text-secondary)]/50 uppercase font-bold tracking-widest">
                        — Flare Sense Vision
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Insights;
