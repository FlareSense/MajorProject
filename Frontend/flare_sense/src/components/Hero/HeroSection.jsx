import React from 'react';
import { motion } from 'framer-motion';
import VideoPlayer from './VideoPlayer';
import { Database, Shield, Zap } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const HeroSection = ({ onShowLogin }) => {
  const { theme } = useTheme();
  const overlayOpacity = theme === 'light' ? 0.4 : 0.6;
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <section className="relative min-h-screen bg-[var(--bg-color)] flex flex-col items-center justify-center pt-24 pb-12 overflow-hidden transition-colors duration-500">
        {/* Themed Gradient Overlay for Cinematic Video */}
        <div 
          className="absolute inset-0 z-[1] bg-gradient-to-b from-[var(--nav-bg)] via-transparent to-[var(--bg-color)] pointer-events-none transition-opacity duration-500" 
          style={{ opacity: overlayOpacity }}
        />
        {/* Video Background Container */}
        <div className="absolute inset-0 z-0 bottom-[35vh] h-[80vh]">
            <VideoPlayer 
                src="https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8"
                className="opacity-100" 
            />
        </div>

        {/* Content Overlay */}
        <motion.div 
            className="relative z-10 w-full max-w-6xl px-6 flex flex-col items-center text-center gap-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Badges */}
            <motion.div className="flex flex-wrap justify-center gap-4" variants={itemVariants}>
                {[
                  { label: "Sub-second AI Vision", icon: Zap },
                  { label: "Early Warning System", icon: Shield },
                  { label: "Multi-Channel Alerts", icon: Database }
                ].map((badge, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-2 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-md shadow-xl">
                        <badge.icon size={16} className="text-blue-400" />
                        <span className="text-sm font-medium text-[var(--text-primary)]/80">{badge.label}</span>
                    </div>
                ))}
            </motion.div>

            {/* Headline */}
            <motion.h1 
                className="text-5xl md:text-7xl lg:text-7xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.1] max-w-5xl text-center"
                variants={itemVariants}
            >
                Real Time Fire Detection <br className="hidden md:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">With Instant Emails And Audio Alerts</span>
            </motion.h1>

            {/* Subtext */}
            <motion.p 
                className="text-lg md:text-xl text-[var(--text-secondary)] max-w-3xl font-light"
                variants={itemVariants}
            >
                Harness the power of AI-driven CCTV security to detect fire anomalies instantly. Protect properties and lives with immediate SMS, Telegram, and Audio alerts.
            </motion.p>

            {/* Buttons */}
            <motion.div className="flex flex-wrap gap-6" variants={itemVariants}>
                <button 
                  onClick={onShowLogin}
                  className="px-10 py-4 bg-[var(--text-primary)] border border-[var(--glass-border)] text-[var(--bg-color)] rounded-full font-medium hover:opacity-90 transition-all duration-300 shadow-2xl"
                >
                    Get Started for Free
                </button>
            </motion.div>
        </motion.div>
    </section>
  );
};

export default HeroSection;
