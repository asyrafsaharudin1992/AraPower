import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';

export interface InboxUIProps {
  notifications: any[];
  setActiveTab: (tab: string) => void;
  markAllAsRead: () => void;
  markNotificationAsRead: (id: string) => void;
}

export const InboxUI: React.FC<InboxUIProps> = ({
  notifications,
  setActiveTab,
  markAllAsRead,
  markNotificationAsRead
}) => {
  return (
    <motion.div 
      key="inbox"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <button 
        onClick={() => setActiveTab('profile')}
        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors mb-4"
      >
        <ArrowLeft size={20} />
        <span className="text-sm font-bold">Back to Profile</span>
      </button>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Notification Inbox</h2>
          <p className="text-zinc-500">Stay updated with the latest messages from admin.</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-50 hover:bg-zinc-50 text-zinc-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
          >
            <CheckCircle2 size={16} />
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.map((notif) => (
          <motion.div 
            key={notif.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`relative p-6 rounded-[2rem] border transition-all ${
              notif.is_read 
                ? 'bg-white border-zinc-100 opacity-75' 
                : 'bg-white border-violet-500 shadow-xl shadow-violet-500 ring-1 ring-violet-500'
            }`}
          >
            {!notif.is_read && (
              <div className="absolute top-6 right-6 w-3 h-3 bg-violet-500 rounded-full animate-pulse shadow-lg shadow-violet-500" />
            )}
            
            <div className="flex gap-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                notif.is_read ? 'bg-zinc-50 text-zinc-500' : 'bg-violet-500 text-white'
              }`}>
                <Mail size={24} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`text-lg font-black tracking-tight truncate ${
                    notif.is_read ? 'text-zinc-500' : 'text-zinc-900'
                  }`}>
                    {notif.title}
                  </h4>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {new Date(notif.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className={`text-sm leading-relaxed mb-4 ${
                  notif.is_read ? 'text-zinc-500' : 'text-zinc-500'
                }`}>
                  {notif.message}
                </p>
                
                {!notif.is_read && (
                  <button 
                    onClick={() => markNotificationAsRead(notif.id)}
                    className="text-[10px] font-black uppercase tracking-widest text-zinc-900 hover:text-zinc-900 flex items-center gap-1.5 group"
                  >
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
            <p className="text-zinc-500 max-w-xs mx-auto text-sm">
              Your inbox is empty. We'll notify you when there's something new!
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
