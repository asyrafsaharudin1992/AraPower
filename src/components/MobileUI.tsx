import React from 'react';
import { LayoutDashboard, Calendar, Zap, UserCircle } from 'lucide-react';

export type MobileTab = 'dashboard' | 'referrals' | 'admin' | 'receptionist' | 'setup' | 'guide' | 'profile' | 'tasks' | 'promotions' | 'payouts' | 'inbox' | 'communication' | 'warm-leads';

const BLUE = '#1580c2';

export const MobileUI = ({
  reduceTranslucency,
  activeTab,
  setActiveTab,
}: any) => {
  const tabs = [
    { key: 'dashboard',   icon: LayoutDashboard },
    { key: 'referrals',   icon: Calendar },
    { key: 'promotions',  icon: Zap },
    { key: 'profile',     icon: UserCircle },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 px-4 z-50 pointer-events-none">
      <nav
        style={{
          maxWidth: '28rem',
          margin: '0 auto',
          background: reduceTranslucency ? '#ffffff' : 'rgba(255,255,255,0.85)',
          backdropFilter: reduceTranslucency ? 'none' : 'blur(20px)',
          WebkitBackdropFilter: reduceTranslucency ? 'none' : 'blur(20px)',
          border: '1.5px solid rgba(21,128,194,0.12)',
          borderRadius: '2.5rem',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          boxShadow: '0 20px 50px rgba(21,128,194,0.12)',
          pointerEvents: 'auto',
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {tabs.map(({ key, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transform: isActive ? 'scale(1.12)' : 'scale(1)',
                transition: 'transform 0.2s ease',
              }}
            >
              <div
                style={{
                  padding: '8px',
                  borderRadius: '14px',
                  background: isActive ? `${BLUE}15` : 'transparent',
                  color: isActive ? BLUE : 'rgba(21,128,194,0.35)',
                  transition: 'background 0.2s ease, color 0.2s ease',
                }}
              >
                <Icon size={22} />
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
};