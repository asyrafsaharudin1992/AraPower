import React from 'react';
import { LayoutDashboard, Calendar, Plus, Zap, UserCircle } from 'lucide-react';

export type MobileTab = 'dashboard' | 'referrals' | 'admin' | 'receptionist' | 'setup' | 'guide' | 'profile' | 'tasks' | 'promotions' | 'payouts' | 'inbox' | 'communication' | 'warm-leads';

export const MobileUI = ({
  reduceTranslucency,
  activeTab,
  setActiveTab,
  setShowReferralModal
}: any) => {
  return (
    <div className="fixed bottom-6 left-0 right-0 px-4 z-50 pointer-events-none">
      <nav className={`max-w-md mx-auto ${reduceTranslucency ? 'bg-eggshell' : 'bg-eggshell/80 backdrop-blur-2xl'} border border-twilight-indigo/10 px-4 py-3 flex justify-between items-center rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] pointer-events-auto`}>
        <div className="flex flex-1 justify-around items-center">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'dashboard' ? 'text-burnt-peach scale-110' : 'text-twilight-indigo/40 hover:text-twilight-indigo'}`}
          >
            <div className={`p-2 rounded-2xl transition-colors ${activeTab === 'dashboard' ? 'bg-burnt-peach/10' : ''}`}>
              <LayoutDashboard size={22} />
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('referrals')}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'referrals' ? 'text-burnt-peach scale-110' : 'text-twilight-indigo/40 hover:text-twilight-indigo'}`}
          >
            <div className={`p-2 rounded-2xl transition-colors ${activeTab === 'referrals' ? 'bg-burnt-peach/10' : ''}`}>
              <Calendar size={22} />
            </div>
          </button>
        </div>

        {/* Central FAB */}
        <div className="px-2">
          <button 
            onClick={() => setShowReferralModal(true)}
            className="w-14 h-14 bg-burnt-peach text-white rounded-full flex items-center justify-center shadow-lg shadow-burnt-peach/40 active:scale-95 transition-transform"
          >
            <Plus size={28} strokeWidth={3} />
          </button>
        </div>

        <div className="flex flex-1 justify-around items-center">
          <button 
            onClick={() => setActiveTab('promotions')}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'promotions' ? 'text-burnt-peach scale-110' : 'text-twilight-indigo/40 hover:text-twilight-indigo'}`}
          >
            <div className={`p-2 rounded-2xl transition-colors ${activeTab === 'promotions' ? 'bg-burnt-peach/10' : ''}`}>
              <Zap size={22} />
            </div>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'profile' ? 'text-burnt-peach scale-110' : 'text-twilight-indigo/40 hover:text-twilight-indigo'}`}
          >
            <div className={`p-2 rounded-2xl transition-colors ${activeTab === 'profile' ? 'bg-burnt-peach/10' : ''}`}>
              <UserCircle size={22} />
            </div>
          </button>
        </div>
      </nav>
    </div>
  );
};
