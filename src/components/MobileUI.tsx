import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Calendar, Zap, UserCircle, Plus,
  Mail, CheckCircle2, ArrowLeft, ShieldAlert
} from 'lucide-react';

// Tab content components — passed via props from App
import { ReferralBoard } from './ReferralBoard';
import { PromotionsUI } from './PromotionsUI';

// Lazy-loaded heavier components
const DashboardUI = React.lazy(() => import('./DashboardUI').then(m => ({ default: m.DashboardUI })));
const ProfileUI = React.lazy(() => import('./ProfileUI').then(m => ({ default: m.ProfileUI })));

export type MobileTab =
  | 'dashboard'
  | 'referrals'
  | 'promotions'
  | 'profile'
  | 'inbox'
  | 'affiliates'
  | 'admin'
  | 'receptionist'
  | 'setup'
  | 'guide'
  | 'tasks'
  | 'payouts'
  | 'communication'
  | 'warm-leads';

export interface MobileUIProps {
  // User
  currentUser: any;
  clinicProfile: any;
  darkMode: boolean;
  reduceTranslucency: boolean;

  // Navigation
  activeTab: MobileTab;
  setActiveTab: (tab: MobileTab) => void;
  setShowReferralModal: (open: boolean) => void;

  // Data
  referrals: any[];
  branches: any[];
  services: any[];
  promotions: any[];
  serviceCategories: any[];
  staffList: any[];
  notifications: any[];
  unreadNotificationsCount: number;

  // Stats
  adminStats: any;
  receptionistStats: any;
  activeStaffList: any[];
  currentUserStats: any;
  progressToNext: number;
  nextTier: any;

  // Status helpers
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  checkBranchAccess: (service: any) => boolean;
  getServiceStatus: (service: any) => string;

  // Referral handlers
  fetchReferrals: () => void;
  handleUpdateStatus: (id: string, status: string, additionalData?: any) => void;
  handleClinicStatusUpdate: (id: string, newStatus: string) => void;
  handleDeleteReferral: (id: string) => void;
  handleDeleteService: (id: string) => void;

  // Modal helpers
  setSelectedPromo: (promo: any) => void;
  setIsPromoModalOpen: (open: boolean) => void;
  setSelectedStaffDetail: (staff: any) => void;
  setShowStaffModal: (open: boolean) => void;

  // Promotions
  promoSubTab: string;
  setPromoSubTab: (tab: string) => void;
  editingService: any;
  setEditingService: (service: any) => void;
  fetchServices: () => void;
  selectedPromo: any;
  isPromoModalOpen: boolean;

  // Profile
  isUploading: boolean;
  handleImageUpload: (e: any) => void;
  handleUpdateProfile: (data: any) => void;
  THEMES: Record<string, { accent: string; surface: string; name: string }>;
  selectedTheme: string;
  setSelectedTheme: (theme: string) => void;
  windowWidth: number;
  setDarkMode: (mode: boolean) => void;
  setReduceTranslucency: (val: boolean) => void;
  setShowPasswordModal: (open: boolean) => void;
  feedbackMessage: string;
  setFeedbackMessage: (msg: string) => void;
  handleSendFeedback: (e?: React.FormEvent) => void;
  isSendingFeedback: boolean;
  handleLogout: () => void;

  // Notifications
  markAllAsRead: () => void;
  markNotificationAsRead: (id: number) => void;
}

export const MobileUI: React.FC<MobileUIProps> = ({
  currentUser,
  clinicProfile,
  darkMode,
  reduceTranslucency,
  activeTab,
  setActiveTab,
  setShowReferralModal,
  referrals,
  branches,
  services,
  promotions,
  serviceCategories,
  staffList,
  notifications,
  unreadNotificationsCount,
  adminStats,
  receptionistStats,
  activeStaffList,
  currentUserStats,
  progressToNext,
  nextTier,
  getStatusColor,
  getStatusLabel,
  checkBranchAccess,
  getServiceStatus,
  fetchReferrals,
  handleUpdateStatus,
  handleClinicStatusUpdate,
  handleDeleteReferral,
  handleDeleteService,
  setSelectedPromo,
  setIsPromoModalOpen,
  setSelectedStaffDetail,
  setShowStaffModal,
  promoSubTab,
  setPromoSubTab,
  editingService,
  setEditingService,
  fetchServices,
  selectedPromo,
  isPromoModalOpen,
  isUploading,
  handleImageUpload,
  handleUpdateProfile,
  THEMES,
  selectedTheme,
  setSelectedTheme,
  windowWidth,
  setDarkMode,
  setReduceTranslucency,
  setShowPasswordModal,
  feedbackMessage,
  setFeedbackMessage,
  handleSendFeedback,
  isSendingFeedback,
  handleLogout,
  markAllAsRead,
  markNotificationAsRead,
}) => {
  return (
    <div className="pb-44 min-h-screen bg-white relative">

      {/* Background ambient gradients */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-muted-teal/10 to-transparent -z-10 pointer-events-none" />
      <div className="absolute top-[10%] -right-[20%] w-[80%] h-[40%] bg-burnt-peach/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* ── BOTTOM NAV ─────────────────────────────────────────── */}
      <div className="fixed bottom-6 left-0 right-0 px-4 z-50 pointer-events-none">
        <nav className={`max-w-md mx-auto ${reduceTranslucency ? 'bg-white' : 'bg-white/80 backdrop-blur-2xl'} border border-[#1580c2]/10 px-4 py-3 flex justify-between items-center rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] pointer-events-auto`}>

          <div className="flex flex-1 justify-around items-center">
            <button onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'dashboard' ? 'text-burnt-peach scale-110' : 'text-twilight-indigo/40 hover:text-twilight-indigo'}`}>
              <div className={`p-2 rounded-2xl transition-colors ${activeTab === 'dashboard' ? 'bg-burnt-peach/10' : ''}`}>
                <LayoutDashboard size={22} />
              </div>
            </button>
            <button onClick={() => setActiveTab('referrals')}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'referrals' ? 'text-burnt-peach scale-110' : 'text-twilight-indigo/40 hover:text-twilight-indigo'}`}>
              <div className={`p-2 rounded-2xl transition-colors ${activeTab === 'referrals' ? 'bg-burnt-peach/10' : ''}`}>
                <Calendar size={22} />
              </div>
            </button>
          </div>

          <div className="flex flex-1 justify-around items-center">
            <button onClick={() => setActiveTab('promotions')}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'promotions' ? 'text-burnt-peach scale-110' : 'text-twilight-indigo/40 hover:text-twilight-indigo'}`}>
              <div className={`p-2 rounded-2xl transition-colors ${activeTab === 'promotions' ? 'bg-burnt-peach/10' : ''}`}>
                <Zap size={22} />
              </div>
            </button>
            <button onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'profile' ? 'text-burnt-peach scale-110' : 'text-twilight-indigo/40 hover:text-twilight-indigo'}`}>
              <div className={`p-2 rounded-2xl transition-colors ${activeTab === 'profile' ? 'bg-burnt-peach/10' : ''}`}>
                <UserCircle size={22} />
              </div>
            </button>
          </div>
        </nav>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────── */}
      <div className="p-4">

        {/* Account pending approval screen */}
        {!currentUser.is_approved && currentUser.role !== 'admin' && activeTab !== 'profile' ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 relative z-10"
          >
            <div className="w-24 h-24 bg-apricot-cream text-twilight-indigo rounded-[2.5rem] flex items-center justify-center shadow-xl shadow-apricot-cream/20 border border-apricot-cream/30">
              <ShieldAlert size={48} />
            </div>
            <div className="space-y-3 max-w-md">
              <h3 className="text-3xl font-black tracking-tighter text-twilight-indigo">Account Pending Approval</h3>
              <p className="text-twilight-indigo/60 text-sm font-medium leading-relaxed">
                Welcome to {clinicProfile.name}! Your account has been successfully created and is currently being reviewed by our administration team.
              </p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-[#1580c2]/10 shadow-sm max-w-sm w-full">
              <ul className="space-y-5 text-left">
                <li className="flex gap-4 items-center text-xs font-bold text-twilight-indigo/60">
                  <div className="w-2.5 h-2.5 rounded-full bg-burnt-peach shadow-[0_0_10px_rgba(224,122,95,0.5)]" />
                  <span>Reviewing your credentials</span>
                </li>
                <li className="flex gap-4 items-center text-xs font-bold text-twilight-indigo/40">
                  <div className="w-2.5 h-2.5 rounded-full bg-twilight-indigo/5" />
                  <span>Activating your referral code</span>
                </li>
                <li className="flex gap-4 items-center text-xs font-bold text-twilight-indigo/40">
                  <div className="w-2.5 h-2.5 rounded-full bg-twilight-indigo/5" />
                  <span>Granting access to dashboard</span>
                </li>
              </ul>
            </div>
            <div className="flex flex-col items-center gap-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-twilight-indigo/40">
                Estimated time: 24-48 hours
              </p>
              <button onClick={() => setActiveTab('profile')}
                className="px-6 py-3 bg-burnt-peach text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-burnt-peach transition-all active:scale-95">
                Complete your profile while you wait
              </button>
              <button onClick={handleLogout}
                className="text-[10px] font-black uppercase tracking-widest text-twilight-indigo hover:text-twilight-indigo/70 transition-all">
                Sign Out
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            {/* ── STICKY HEADER ──────────────────────────────────── */}
            <header className="flex flex-row items-center justify-between gap-4 z-[100] sticky top-0 bg-white/80 backdrop-blur-xl py-4 -mx-4 px-4 border-b border-[#1580c2]/10 mb-6">
              <div>
                <h2 className="text-3xl font-black tracking-tighter capitalize text-twilight-indigo">
                  {activeTab === 'profile' ? 'My Profile' : activeTab}
                </h2>
              </div>

              <div className="flex items-center gap-4">
                {activeTab === 'dashboard' && (
                  <button onClick={() => setActiveTab('profile')}
                    className="flex items-center gap-3 p-1.5 pr-4 rounded-2xl transition-all active:scale-95 bg-white hover:bg-[#1580c2]/5 border-[#1580c2]/10 shadow-sm border">
                    <div className="w-8 h-8 rounded-xl bg-burnt-peach text-white flex items-center justify-center text-xs font-black shadow-lg shadow-burnt-peach/20 overflow-hidden relative">
                      {currentUser.profile_picture ? (
                        <img src={currentUser.profile_picture} alt={currentUser.name}
                          className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        currentUser?.name?.charAt(0) || '?'
                      )}
                      {unreadNotificationsCount > 0 && (
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black tracking-tight text-twilight-indigo">{currentUser.name}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-twilight-indigo/40">{currentUser.role}</p>
                    </div>
                  </button>
                )}

                {activeTab === 'profile' && (
                  <button onClick={() => setActiveTab('inbox')}
                    className="p-3 rounded-2xl transition-all relative bg-white hover:bg-zinc-50 text-zinc-500 border border-black/5 shadow-sm">
                    <Mail size={20} />
                    {unreadNotificationsCount > 0 && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                    )}
                  </button>
                )}
              </div>
            </header>


            {/* ── PROFILE COMPLETION BANNER ─────────────────────── */}
            {activeTab === 'dashboard' &&
              !!(!(currentUser.bank_name && currentUser.bank_account_number && currentUser.id_number)) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 mx-0"
              >
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-amber-800 leading-tight">Complete your profile</p>
                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                      Add your IC number and bank details to receive payouts and unlock sharing.
                    </p>
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="mt-2 text-xs font-black text-amber-800 underline underline-offset-2 active:opacity-70"
                    >
                      Complete Now →
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── TAB CONTENT ──────────────────────────────────────── */}
            <AnimatePresence mode="wait">

              {activeTab === 'dashboard' && (
                <React.Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-burnt-peach" /></div>}>
                  <DashboardUI
                    currentUser={currentUser}
                    referrals={referrals}
                    clinicProfile={clinicProfile}
                    adminStats={adminStats}
                    receptionistStats={receptionistStats}
                    activeStaffList={activeStaffList}
                    staffList={staffList}
                    services={services}
                    currentUserStats={currentUserStats}
                    progressToNext={progressToNext}
                    nextTier={nextTier}
                    isMobile={true}
                    checkBranchAccess={checkBranchAccess}
                    setActiveTab={setActiveTab}
                    handleDeleteReferral={handleDeleteReferral}
                    handleUpdateStatus={handleUpdateStatus}
                    handleClinicStatusUpdate={handleClinicStatusUpdate}
                    setSelectedPromo={setSelectedPromo}
                    setIsPromoModalOpen={setIsPromoModalOpen}
                    getStatusColor={getStatusColor}
                    getStatusLabel={getStatusLabel}
                    setSelectedStaffDetail={setSelectedStaffDetail}
                    setShowStaffModal={setShowStaffModal}
                  />
                </React.Suspense>
              )}

              {activeTab === 'referrals' && (
                <ReferralBoard
                  currentUser={currentUser}
                  referrals={referrals}
                  branches={branches}
                  clinicProfile={clinicProfile}
                  isMobile={true}
                  darkMode={darkMode}
                  fetchReferrals={fetchReferrals}
                  handleUpdateStatus={handleUpdateStatus}
                  handleClinicStatusUpdate={handleClinicStatusUpdate}
                  handleDeleteReferral={handleDeleteReferral}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                  staffList={staffList}
                />
              )}

              {activeTab === 'promotions' && (
                <PromotionsUI
                  currentUser={currentUser}
                  clinicProfile={clinicProfile}
                  darkMode={darkMode}
                  isMobile={true}
                  services={services}
                  promotions={promotions}
                  serviceCategories={serviceCategories}
                  promoSubTab={promoSubTab}
                  setPromoSubTab={setPromoSubTab}
                  editingService={editingService}
                  setEditingService={setEditingService}
                  fetchServices={fetchServices}
                  handleDeleteService={handleDeleteService}
                  getServiceStatus={getServiceStatus}
                  checkBranchAccess={checkBranchAccess}
                  selectedPromo={selectedPromo}
                  setSelectedPromo={setSelectedPromo}
                  isPromoModalOpen={isPromoModalOpen}
                  setIsPromoModalOpen={setIsPromoModalOpen}
                />
              )}

              {activeTab === 'profile' && (
                <React.Suspense fallback={null}>
                  <ProfileUI
                    currentUser={currentUser}
                    darkMode={darkMode}
                    isUploading={isUploading}
                    handleImageUpload={handleImageUpload}
                    handleUpdateProfile={handleUpdateProfile}
                    THEMES={THEMES}
                    selectedTheme={selectedTheme}
                    setSelectedTheme={setSelectedTheme}
                    windowWidth={windowWidth}
                    setDarkMode={setDarkMode}
                    reduceTranslucency={reduceTranslucency}
                    setReduceTranslucency={setReduceTranslucency}
                    setActiveTab={setActiveTab}
                    setShowPasswordModal={setShowPasswordModal}
                    feedbackMessage={feedbackMessage}
                    setFeedbackMessage={setFeedbackMessage}
                    handleSendFeedback={handleSendFeedback}
                    isSendingFeedback={isSendingFeedback}
                    handleLogout={handleLogout}
                  />
                </React.Suspense>
              )}

              {activeTab === 'inbox' && (
                <motion.div
                  key="inbox"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <button onClick={() => setActiveTab('profile')}
                    className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors mb-4">
                    <ArrowLeft size={20} />
                    <span className="text-sm font-bold">Back to Profile</span>
                  </button>

                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Notification Inbox</h2>
                      <p className="text-zinc-500">Stay updated with the latest messages from admin.</p>
                    </div>
                    {notifications.some(n => !n.is_read) && (
                      <button onClick={markAllAsRead}
                        className="flex items-center gap-2 px-6 py-3 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                        <CheckCircle2 size={16} />
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {notifications.map((notif) => (
                      <motion.div key={notif.id} layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`relative p-6 rounded-[2rem] border transition-all ${
                          notif.is_read
                            ? 'bg-white border-zinc-100 opacity-75'
                            : 'bg-white border-violet-500 shadow-xl ring-1 ring-violet-500'
                        }`}
                      >
                        {!notif.is_read && (
                          <div className="absolute top-6 right-6 w-3 h-3 bg-violet-500 rounded-full animate-pulse shadow-lg shadow-violet-500" />
                        )}
                        <div className="flex gap-6">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${notif.is_read ? 'bg-zinc-50 text-zinc-500' : 'bg-violet-500 text-white'}`}>
                            <Mail size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className={`text-lg font-black tracking-tight truncate ${notif.is_read ? 'text-zinc-500' : 'text-zinc-900'}`}>
                                {notif.title}
                              </h4>
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                {new Date(notif.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed mb-4 text-zinc-500">{notif.message}</p>
                            {!notif.is_read && (
                              <button onClick={() => markNotificationAsRead(notif.id)}
                                className="text-[10px] font-black uppercase tracking-widest text-zinc-900 flex items-center gap-1.5 group">
                                <CheckCircle2 size={14} className="group-hover:scale-110 transition-transform" />
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {notifications.length === 0 && (
                      <div className="bg-zinc-50 rounded-[3rem] p-20 text-center border-2 border-dashed border-zinc-200">
                        <div className="w-20 h-20 bg-zinc-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-zinc-500">
                          <Mail size={40} />
                        </div>
                        <h3 className="text-xl font-black text-zinc-900 mb-2">No notifications yet</h3>
                        <p className="text-zinc-500 max-w-xs mx-auto text-sm">Your inbox is empty. We'll notify you when there's something new!</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
};