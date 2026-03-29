import React from 'react';
import { motion } from 'framer-motion';

const Navbar = ({ onShowLogin }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-12 py-5 bg-[#0a0f1d]/90 backdrop-blur-2xl border-b border-blue-500/20 shadow-2xl">
        <div className="flex items-center gap-3">
            <img src="/logo.png" alt="FlareSense Logo" className="w-12 h-12 lg:w-16 lg:h-16 object-contain" />
            <span className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white uppercase">FlareSense</span>
        </div>

        <div className="hidden lg:flex items-center gap-10">
            <a href="#features" className="relative group">
                <span className="text-base lg:text-lg font-semibold text-white/70 group-hover:text-white transition-colors">Features</span>
                <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </a>
            <a href="#insights" className="relative group text-base lg:text-lg font-semibold text-white/70 hover:text-white transition-colors">
                Insights
                <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </a>
            <a href="#about" className="relative group text-base lg:text-lg font-semibold text-white/70 hover:text-white transition-colors">
                About
                <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </a>
            <a href="#contact" className="relative group text-base lg:text-lg font-semibold text-white/70 hover:text-white transition-colors">
                Contact
                <div className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </a>
        </div>

        <button 
            onClick={onShowLogin}
            className="hidden md:block px-8 py-3 text-base lg:text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full hover:opacity-90 hover:scale-105 transition-all shadow-lg shadow-blue-500/30"
        >
            Get Started for Free
        </button>
    </nav>
  );
};

export default Navbar;
