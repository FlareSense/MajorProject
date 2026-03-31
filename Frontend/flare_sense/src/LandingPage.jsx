import React from 'react';
import Navbar from './components/Hero/Navbar';
import HeroSection from './components/Hero/HeroSection';
import LogoRow from './components/Hero/LogoMarquee';
import Features from './components/Landing/Features';
import Insights from './components/Landing/Insights';
import About from './components/Landing/About';
import Contact from './components/Landing/Contact';
import Footer from './components/Landing/Footer';

const LandingPage = ({ onShowLogin }) => {
  return (
    <div className="min-h-screen selection:bg-blue-500/30 transition-colors duration-500">
        <Navbar onShowLogin={onShowLogin} />
        <main>
            <HeroSection onShowLogin={onShowLogin} />
            <LogoRow />
            <Features />
            <Insights />
            <About />
            <Contact />
        </main>
        <Footer />
        
        {/* Abstract Decorative Elements */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        </div>
    </div>
  );
};

export default LandingPage;
