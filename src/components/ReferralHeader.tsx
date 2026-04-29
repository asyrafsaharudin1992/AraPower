import React from 'react';
import { Download, Search, SlidersHorizontal } from 'lucide-react';

interface ReferralHeaderProps {
  onSearchChange?: (value: string) => void;
  onFilterClick?: () => void;
  onExportClick?: () => void;
  children?: React.ReactNode;
}

export const ReferralHeader: React.FC<ReferralHeaderProps> = ({
  onSearchChange,
  onFilterClick,
  onExportClick,
  children
}) => {
  return (
    <div className="w-full bg-white pt-4 min-h-screen">
      {/* Main Card Container */}
      <div className="max-w-4xl mx-auto px-4 md:px-0">
        <div className="bg-white backdrop-blur-2xl rounded-t-[2.5rem] border-t border-white/60 p-5 shadow-2xl shadow-[#3D405B]/5">
          
          {/* Header Row (Title & Export) */}
          <div className="flex justify-between items-center mb-4 px-2">
            <h1 className="text-xl md:text-2xl font-bold text-[#3D405B] tracking-tight">
              Referral History
            </h1>
            <button 
              onClick={onExportClick}
              className="p-3 rounded-xl bg-[#3D405B]/10 text-[#3D405B] hover:bg-[#3D405B]/20 transition-all active:scale-95"
              aria-label="Export"
            >
              <Download size={20} />
            </button>
          </div>

          {/* Unified Search & Filter Bar */}
          <div className="relative group px-1">
            <div className="flex items-center w-full h-12 px-4 bg-white rounded-2xl border border-[#3D405B]/10 shadow-sm transition-all focus-within:shadow-md focus-within:border-[#3D405B]/20">
              
              {/* Inside Left: Search Icon */}
              <Search className="text-[#3D405B]/60 mr-3" size={18} />
              
              {/* Center (Input) */}
              <input 
                type="text" 
                placeholder="Search patient, staff, or service..."
                className="flex-grow bg-transparent border-none outline-none text-[#3D405B] placeholder:text-[#3D405B]/30 text-sm font-medium"
                onChange={(e) => onSearchChange?.(e.target.value)}
              />
              
              {/* Inside Right: Filter Button */}
              <button 
                onClick={onFilterClick}
                className="p-2 ml-2 text-[#3D405B] hover:bg-[#3D405B]/5 rounded-xl transition-colors"
                aria-label="Filter"
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>
          </div>

          {/* Faint horizontal divider */}
          <div className="mt-6 border-b border-[#3D405B]/5" />
          
          {/* Data List Area */}
          <div className="mt-4">
            {children}
          </div>

        </div>
      </div>
    </div>
  );
};
