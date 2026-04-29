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
    <div className="w-full bg-[#f8fafc] pt-4">
      {/* Main Container */}
      <div className="w-full mx-auto px-4 lg:px-8">
        <div 
          className="bg-white rounded-[2.5rem] border border-[#1580c2]/10 p-5 shadow-sm"
        >
          
          {/* Header Row (Title & Export) */}
          <div 
            className="flex justify-between items-center mb-4 px-2"
            style={{ 
              paddingLeft: '14px',
              marginLeft: '-30px',
              marginRight: '-30px',
              paddingRight: '29px',
              marginTop: '0px'
            }}
          >
            <h1 className="text-xl md:text-2xl font-bold text-[#1580c2] tracking-tight">
              Referral History
            </h1>
            <button 
              onClick={onExportClick}
              className="p-3 rounded-xl bg-[#1580c2]/10 text-[#1580c2] hover:bg-[#1580c2]/20 transition-all active:scale-95"
              aria-label="Export"
            >
              <Download size={20} />
            </button>
          </div>

          {/* Unified Search & Filter Bar */}
          <div className="relative group px-1">
            <div className="flex items-center w-full h-12 px-4 bg-white rounded-2xl border border-[#1580c2]/10 shadow-sm transition-all focus-within:shadow-md focus-within:border-[#1580c2]/20">
              
              {/* Inside Left: Search Icon */}
              <Search className="text-[#1580c2]/50 mr-3" size={18} />
              
              {/* Center (Input) */}
              <input 
                type="text" 
                placeholder="Search patient, staff, or service..."
                className="flex-grow bg-transparent border-none outline-none text-[#1580c2] placeholder:text-[#1580c2]/30 text-sm font-medium"
                onChange={(e) => onSearchChange?.(e.target.value)}
              />
              
              {/* Inside Right: Filter Button */}
              <button 
                onClick={onFilterClick}
                className="p-2 ml-2 text-[#1580c2] hover:bg-[#1580c2]/5 rounded-xl transition-colors"
                aria-label="Filter"
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>
          </div>

          {/* Faint horizontal divider */}
          <div className="mt-6 border-b border-[#1580c2]/5" />
          
          {/* Data List Area */}
          <div className="mt-4">
            {children}
          </div>

        </div>
      </div>
    </div>
  );
};
