import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const LogoRow = () => {
  const { theme } = useTheme();
  const iconColor = theme === 'light' ? '0288d1' : 'ffffff';
  
  const logos = [
    { name: 'Google', icon: `https://cdn.simpleicons.org/google/${iconColor}` },
    { name: 'Apple', icon: `https://cdn.simpleicons.org/apple/${iconColor}` },
    { name: 'Airbnb', icon: `https://cdn.simpleicons.org/airbnb/${iconColor}` },
    { name: 'Spotify', icon: `https://cdn.simpleicons.org/spotify/${iconColor}` },
    { name: 'Tesla', icon: `https://cdn.simpleicons.org/tesla/${iconColor}` },
    { name: 'Amazon', icon: `https://cdn.simpleicons.org/amazon/${iconColor}` },
  ];

  return (
    <div className="w-full py-20 overflow-hidden border-t border-[var(--glass-border)] transition-colors duration-500">
        <div className="flex justify-around items-center gap-12 px-8 overflow-x-auto scrollbar-hide grayscale opacity-40">
            {logos.map((logo, index) => (
                <div key={index} className="flex items-center gap-2 hover:opacity-100 transition-opacity">
                    <img src={logo.icon} alt={logo.name} className="w-8 h-8 object-contain" />
                    <span className="text-xl font-bold tracking-tighter text-[var(--text-primary)] transition-colors">{logo.name}</span>
                </div>
            ))}
        </div>
    </div>
  );
};

export default LogoRow;
