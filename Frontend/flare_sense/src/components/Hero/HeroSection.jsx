import React from 'react';
import { motion } from 'framer-motion';
import VideoPlayer from './VideoPlayer';
import { Database, Shield, Zap } from 'lucide-react';

const HeroSection = ({ onShowLogin }) => {
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
    <section className="relative min-h-screen bg-black flex flex-col items-center justify-center pt-24 pb-12 overflow-hidden">
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
                  { label: "High Security", icon: Shield },
                  { label: "Fast Deployment", icon: Zap },
                  { label: "Cloud Integrated", icon: Database }
                ].map((badge, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-xl">
                        <badge.icon size={16} className="text-blue-400" />
                        <span className="text-sm font-medium text-white/80">Integrated with {badge.label}</span>
                    </div>
                ))}
            </motion.div>

            {/* Headline */}
            <motion.h1 
                className="text-6xl md:text-8xl font-bold tracking-tight text-white leading-[0.9] max-w-5xl"
                variants={itemVariants}
            >
                Where Innovation <br /> Meets Execution
            </motion.h1>

            {/* Subtext */}
            <motion.p 
                className="text-lg md:text-xl text-white/60 max-w-2xl font-light"
                variants={itemVariants}
            >
                Harness the power of AI-driven security and intelligent analytics to protect your assets and streamline resident management seamlessly.
            </motion.p>

            {/* Buttons */}
            <motion.div className="flex flex-wrap gap-6" variants={itemVariants}>
                <button 
                  onClick={onShowLogin}
                  className="px-10 py-4 bg-black border border-white/20 text-white rounded-full font-medium hover:bg-white hover:text-black transition-all duration-300 shadow-2xl"
                >
                    Get Started for Free
                </button>
                <button 
                  onClick={onShowLogin}
                  className="px-10 py-4 bg-white/5 border border-white/5 text-white/90 rounded-full font-medium backdrop-blur-xl hover:bg-white/10 transition-all duration-300"
                >
                    Let's Get Connected
                </button>
            </motion.div>
        </motion.div>
    </section>
  );
};

export default HeroSection;
