import React from 'react';
import { ShieldCheck } from 'lucide-react';

const About = () => {
    return (
        <section id="about" className="py-24 bg-[var(--bg-color)] relative z-10 px-6 transition-colors duration-500">
            <div className="max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-blue-400 mb-8 border border-[var(--glass-border)] transition-colors">
                    <ShieldCheck size={32} />
                </div>
                <h2 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-8">About Flare Sense</h2>
                <div className="space-y-6 text-lg text-[var(--text-secondary)] leading-relaxed font-light">
                    <p>
                        Flare Sense is an advanced Early Warning System (EWS) engineered to replace slow, outdated fire safety infrastructures.
                        By leveraging Deep Learning and custom YOLO architecture, we've created a platform that turns continuous camera feeds into
                        a highly proactive threat detection array.
                    </p>
                    <p>
                        Whether a residential complex, commercial warehouse, or smart city grid, our mission is universal: eliminate response delays to protect lives and properties safely. 
                        Every second counts, and we ensure security administrators and residents receive verified evidence instantaneously.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default About;
