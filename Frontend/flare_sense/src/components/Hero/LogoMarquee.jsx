import React from 'react';

const LogoRow = () => {
  const logos = [
    { name: 'Google', icon: 'https://cdn.simpleicons.org/google/ffffff' },
    { name: 'Apple', icon: 'https://cdn.simpleicons.org/apple/ffffff' },
    { name: 'Airbnb', icon: 'https://cdn.simpleicons.org/airbnb/ffffff' },
    { name: 'Spotify', icon: 'https://cdn.simpleicons.org/spotify/ffffff' },
    { name: 'Tesla', icon: 'https://cdn.simpleicons.org/tesla/ffffff' },
    { name: 'Amazon', icon: 'https://cdn.simpleicons.org/amazon/ffffff' },
  ];

  return (
    <div className="w-full py-20 overflow-hidden border-t border-white/5">
        <div className="flex justify-around items-center gap-12 px-8 overflow-x-auto scrollbar-hide grayscale opacity-40">
            {logos.map((logo, index) => (
                <div key={index} className="flex items-center gap-2 hover:opacity-100 transition-opacity">
                    <img src={logo.icon} alt={logo.name} className="w-8 h-8 object-contain contrast-0" />
                    <span className="text-xl font-bold tracking-tighter text-white">{logo.name}</span>
                </div>
            ))}
        </div>
    </div>
  );
};

export default LogoRow;
