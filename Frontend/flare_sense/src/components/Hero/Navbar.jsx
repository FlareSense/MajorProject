import React from 'react';
import { motion } from 'framer-motion';

const Navbar = ({ onShowLogin }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-black/50 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2">
            <span className="text-2xl font-medium tracking-tight text-white uppercase">Synapse</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="relative group">
                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Features</span>
                <div className="absolute -bottom-1 left-0 right-0 h-[1px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
            </a>
            <a href="#insights" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Insights</a>
            <a href="#about" className="text-sm font-medium text-white/70 hover:text-white transition-colors">About</a>
            <a href="#case-studies" className="text-sm font-medium text-white/70 hover:text-white line-through transition-colors">Case Studies</a>
            <a href="#contact" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Contact</a>
        </div>

        <button 
            onClick={onShowLogin}
            className="px-6 py-2 text-sm font-medium text-black bg-gradient-to-r from-white to-gray-400 rounded-full hover:scale-105 transition-transform"
        >
            Get Started for Free
        </button>
    </nav>
  );
};

export default Navbar;
