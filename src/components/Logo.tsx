import React, { useState } from 'react';
import { Activity } from 'lucide-react';

export const Logo = ({ className = "w-8 h-8", logoUrl }: { className?: string, logoUrl?: string }) => {
  const [error, setError] = useState(false);
  const size = parseInt(className.match(/\d+/)?.[0] || "24");
  
  if (logoUrl && !error) {
    return (
      <div className={`${className} flex items-center justify-center bg-white rounded-xl shadow-inner overflow-hidden`}>
        <img 
          src={logoUrl} 
          alt="Logo" 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${className} flex items-center justify-center bg-violet-500 rounded-xl shadow-inner overflow-hidden`}>
      <Activity className="text-zinc-900" size={size * 0.7} strokeWidth={2.5} />
    </div>
  );
};
