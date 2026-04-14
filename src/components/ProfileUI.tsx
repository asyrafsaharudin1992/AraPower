import React from 'react';
import { motion } from 'motion/react';
import { 
  UserCircle, RefreshCw, PlusCircle, Trash2, DollarSign, Palette, Sun, Moon, BookOpen, ChevronRight, Lock, MessageSquare
} from 'lucide-react';

export interface ProfileUIProps {
  currentUser: any;
  darkMode: boolean;
  isUploading: boolean;
  handleImageUpload: (e: any) => void;
  handleUpdateProfile: (data: any) => void;
  THEMES: any;
  selectedTheme: string;
  setSelectedTheme: (theme: string) => void;
  windowWidth: number;
  setDarkMode: (dark: boolean) => void;
  reduceTranslucency: boolean;
  setReduceTranslucency: (reduce: boolean) => void;
  setActiveTab: (tab: string) => void;
  setShowPasswordModal: (show: boolean) => void;
  feedbackMessage: string;
  setFeedbackMessage: (msg: string) => void;
  handleSendFeedback: () => void;
  isSendingFeedback: boolean;
}

export const ProfileUI: React.FC<ProfileUIProps> = ({
  currentUser,
  darkMode,
  isUploading,
  handleImageUpload,
  handleUpdateProfile,
  THEMES,
  selectedTheme,
  setSelectedTheme,
  windowWidth,
  setDarkMode,
  reduceTranslucency,
  setReduceTranslucency,
  setActiveTab,
  setShowPasswordModal,
  feedbackMessage,
  setFeedbackMessage,
  handleSendFeedback,
  isSendingFeedback
}) => {
  if (!currentUser) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className={`${darkMode ? 'bg-[#1e293b] border-violet-500' : 'bg-[#EDEADE] border-black/5 shadow-sm'} p-8 rounded-[2.5rem] border relative overflow-hidden`}>
        <div className={`absolute top-0 right-0 w-32 h-32 ${darkMode ? 'bg-brand-accent/10' : 'bg-violet-500'} rounded-full blur-3xl -mr-16 -mt-16`} />
        
        <div className="flex flex-col items-center text-center mb-10 relative z-10">
          <div className="relative group mb-6 flex flex-col items-center">
            <div className={`w-32 h-32 rounded-[2.5rem] ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#EDEADE]'} border-4 shadow-xl overflow-hidden flex items-center justify-center relative`}>
              {currentUser.profile_picture ? (
                <img src={currentUser.profile_picture} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserCircle size={64} className={darkMode ? 'text-zinc-900/20' : 'text-zinc-500'} />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <RefreshCw className="text-zinc-900 animate-spin" size={24} />
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <label className={`cursor-pointer ${darkMode ? 'bg-brand-accent text-white' : 'bg-brand-primary text-white'} px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2`}>
                <PlusCircle size={14} />
                Choose Image
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
              </label>
              {currentUser.profile_picture && (
                <button 
                  type="button"
                  onClick={() => handleUpdateProfile({ profile_picture: '' })}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${darkMode ? 'bg-rose-500 text-white' : 'bg-rose-500 text-white hover:bg-rose-500'}`}
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              )}
            </div>
          </div>
          <h3 className={`text-2xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{currentUser.nickname || currentUser.name}</h3>
          <p className={`text-sm font-medium uppercase tracking-widest ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>{currentUser.role}</p>
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleUpdateProfile({
              nickname: formData.get('nickname') as string,
              profile_picture: currentUser.profile_picture,
              bank_name: formData.get('bank_name') as string,
              bank_account_number: formData.get('bank_account_number') as string,
              id_type: formData.get('id_type') as string,
              id_number: formData.get('id_number') as string,
            });
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Nickname</label>
              <input 
                name="nickname"
                type="text"
                defaultValue={currentUser.nickname || ''}
                className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                  darkMode 
                    ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20 focus:border-brand-accent' 
                    : 'bg-white border-black/5 text-zinc-900 focus:ring-violet-500 focus:border-violet-500'
                }`}
                placeholder="Your preferred name"
              />
            </div>
          </div>

          <div className={`pt-6 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
              <DollarSign size={14} className={darkMode ? 'text-brand-accent' : 'text-brand-accent'} />
              Bank Account Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Bank Name</label>
                <input 
                  name="bank_name"
                  type="text"
                  defaultValue={currentUser.bank_name || ''}
                  className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                    darkMode 
                      ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20 focus:border-brand-accent' 
                      : 'bg-white border-black/5 text-zinc-900 focus:ring-violet-500 focus:border-violet-500'
                  }`}
                  placeholder="e.g. Maybank, CIMB"
                />
              </div>
              <div className="space-y-2">
                <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Account Number</label>
                <input 
                  name="bank_account_number"
                  type="text"
                  defaultValue={currentUser.bank_account_number || ''}
                  className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                    darkMode 
                      ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20 focus:border-brand-accent' 
                      : 'bg-white border-black/5 text-zinc-900 focus:ring-violet-500 focus:border-violet-500'
                  }`}
                  placeholder="1234567890"
                />
              </div>
              <div className="space-y-2">
                <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>ID Type</label>
                <select 
                  name="id_type"
                  defaultValue={currentUser.id_type || 'NRIC'}
                  className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                    darkMode 
                      ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20 focus:border-brand-accent' 
                      : 'bg-white border-black/5 text-zinc-900 focus:ring-violet-500 focus:border-violet-500'
                  }`}
                >
                  <option value="NRIC">NRIC</option>
                  <option value="PASSPORT">Passport</option>
                  <option value="BUSINESS_REG">Business Registration</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className={`block text-[10px] font-black uppercase tracking-widest ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>ID Number</label>
                <input 
                  name="id_number"
                  type="text"
                  defaultValue={currentUser.id_number || ''}
                  className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium ${
                    darkMode 
                      ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20 focus:border-brand-accent' 
                      : 'bg-white border-black/5 text-zinc-900 focus:ring-violet-500 focus:border-violet-500'
                  }`}
                  placeholder="e.g. 900101-10-5050"
                />
              </div>
            </div>
          </div>

          <div className={`pt-6 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
              <Palette size={14} className={darkMode ? 'text-brand-accent' : 'text-brand-accent'} />
              Appearance & Theme
            </h4>
            
            <div className="mb-8">
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-4 ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Color Theme</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(THEMES).map(([key, theme]: [string, any]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedTheme(key)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      selectedTheme === key 
                        ? (darkMode ? 'border-brand-accent bg-brand-accent/10' : 'border-violet-500 bg-violet-500')
                        : (darkMode ? 'border-violet-500 bg-zinc-50' : 'border-black/5 bg-white hover:border-zinc-200')
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full shadow-inner"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${
                      selectedTheme === key 
                        ? (darkMode ? 'text-brand-accent' : 'text-zinc-900')
                        : (darkMode ? 'text-zinc-500' : 'text-zinc-500')
                    }`}>
                      {theme.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {windowWidth >= 768 && (
              <div className="mb-8">
                <label className={`block text-[10px] font-black uppercase tracking-widest mb-4 ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>Display Mode</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setDarkMode(false)}
                    className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      !darkMode 
                        ? (darkMode ? 'border-brand-accent bg-brand-accent/10' : 'border-violet-500 bg-violet-500')
                        : (darkMode ? 'border-violet-500 bg-zinc-50' : 'border-black/5 bg-white hover:border-zinc-200')
                    }`}
                  >
                    <Sun size={18} className={!darkMode ? 'text-white' : 'text-zinc-500'} />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${
                      !darkMode 
                        ? (darkMode ? 'text-brand-accent' : 'text-zinc-900')
                        : (darkMode ? 'text-zinc-500' : 'text-zinc-500')
                    }`}>
                      Light Mode
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDarkMode(true)}
                    className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      darkMode 
                        ? (darkMode ? 'border-brand-accent bg-brand-accent/10' : 'border-violet-500 bg-violet-500')
                        : (darkMode ? 'border-violet-500 bg-zinc-50' : 'border-black/5 bg-white hover:border-zinc-200')
                    }`}
                  >
                    <Moon size={18} className={darkMode ? 'text-white' : 'text-zinc-500'} />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${
                      darkMode 
                        ? (darkMode ? 'text-brand-accent' : 'text-zinc-900')
                        : (darkMode ? 'text-zinc-500' : 'text-zinc-500')
                    }`}>
                      Dark Mode
                    </span>
                  </button>
                </div>
              </div>
            )}

            <div className="mb-8">
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-4 ml-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>App Appearance</label>
              <button
                type="button"
                onClick={() => setReduceTranslucency(!reduceTranslucency)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                  reduceTranslucency 
                    ? (darkMode ? 'border-brand-accent bg-brand-accent/10' : 'border-violet-500 bg-violet-500')
                    : (darkMode ? 'border-violet-500 bg-zinc-50' : 'border-black/5 bg-white hover:border-zinc-200')
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${reduceTranslucency ? 'bg-brand-accent' : 'bg-zinc-50'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${reduceTranslucency ? 'left-6' : 'left-1'}`} />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    reduceTranslucency 
                      ? (darkMode ? 'text-brand-accent' : 'text-zinc-900')
                      : (darkMode ? 'text-zinc-500' : 'text-zinc-500')
                  }`}>
                    Reduce deck translucent
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div className={`pt-6 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
              <BookOpen size={14} className={darkMode ? 'text-brand-accent' : 'text-brand-accent'} />
              Resources
            </h4>
            <button 
              type="button"
              onClick={() => setActiveTab('guide')}
              className={`w-full px-6 py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group mb-4 ${
                darkMode 
                  ? 'bg-zinc-50 border-violet-500 text-zinc-900 hover:bg-brand-accent/10' 
                  : 'bg-brand-surface border-brand-accent/10 text-brand-accent hover:bg-brand-accent/5'
              }`}
            >
              <span>View User Guide & FAQ</span>
              <ChevronRight size={16} className={`${darkMode ? 'text-zinc-500' : 'text-brand-accent/60'} group-hover:text-brand-accent transition-colors`} />
            </button>
            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
              <Lock size={14} className={darkMode ? 'text-zinc-900/20' : 'text-zinc-500'} />
              Security
            </h4>
            <button 
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className={`w-full px-6 py-4 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group ${
                darkMode 
                  ? 'bg-zinc-50 border-violet-500 text-zinc-900/60 hover:bg-brand-accent/10' 
                  : 'bg-zinc-50 border-zinc-100 text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              <span>Change Account Password</span>
              <ChevronRight size={16} className={`${darkMode ? 'text-zinc-900/20' : 'text-zinc-500'} group-hover:text-brand-accent transition-colors`} />
            </button>
          </div>

          <div className={`pt-6 border-t ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${darkMode ? 'text-zinc-500' : 'text-zinc-500'}`}>
              <MessageSquare size={14} className={darkMode ? 'text-brand-accent' : 'text-brand-accent'} />
              Developer Feedback
            </h4>
            <div className="space-y-4">
              <p className={`text-xs font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Have a suggestion or found a bug? Send a message directly to the developer.
              </p>
              <textarea 
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                className={`w-full px-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all text-sm font-medium min-h-[120px] resize-none ${
                  darkMode 
                    ? 'bg-zinc-50 border-violet-500 text-zinc-900 focus:ring-brand-accent/20 focus:border-brand-accent' 
                    : 'bg-white border-black/5 text-zinc-900 focus:ring-violet-500 focus:border-violet-500'
                }`}
                placeholder="Type your feedback here..."
              />
              <button 
                type="button"
                onClick={handleSendFeedback}
                disabled={isSendingFeedback || !feedbackMessage.trim()}
                className={`w-full py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  isSendingFeedback 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                } ${
                  darkMode 
                    ? 'bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20' 
                    : 'bg-violet-500 text-white hover:bg-violet-500'
                }`}
              >
                {isSendingFeedback ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <MessageSquare size={16} />
                )}
                {isSendingFeedback ? 'Sending...' : 'Send Feedback'}
              </button>
            </div>
          </div>

          <div className="pt-8">
            <button 
              type="submit"
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] shadow-xl ${
                darkMode 
                  ? 'bg-brand-accent text-brand-primary shadow-brand-accent/20 hover:bg-brand-accent/90' 
                  : 'bg-gradient-to-r from-violet-500 to-rose-500 text-zinc-900 shadow-violet-500 hover:from-violet-500 hover:to-rose-500'
              }`}
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};
