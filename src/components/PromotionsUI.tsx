import React from 'react';
import { motion } from 'motion/react';
import { Zap, Star, Clock, Edit2, Trash2 } from 'lucide-react';
import AddServiceForm from './AddServiceForm';
import { PromotionDetailModal } from './PromotionDetailModal';

export interface PromotionsUIProps {
  currentUser: any;
  clinicProfile: any;
  darkMode: boolean;
  isMobile: boolean;
  services: any[];
  promotions: any[];
  serviceCategories: any[];
  promoSubTab: string;
  setPromoSubTab: (tab: string) => void;
  editingService: any;
  setEditingService: (service: any) => void;
  fetchServices: () => void;
  handleDeleteService: (id: string) => void;
  getServiceStatus: (service: any) => string;
  checkBranchAccess: (service: any) => boolean;
  selectedPromo: any;
  setSelectedPromo: (promo: any) => void;
  isPromoModalOpen: boolean;
  setIsPromoModalOpen: (open: boolean) => void;
}

export const PromotionsUI: React.FC<PromotionsUIProps> = ({
  currentUser,
  clinicProfile,
  darkMode,
  isMobile,
  services,
  promotions,
  serviceCategories,
  promoSubTab,
  setPromoSubTab,
  editingService,
  setEditingService,
  fetchServices,
  handleDeleteService,
  getServiceStatus,
  checkBranchAccess,
  selectedPromo,
  setSelectedPromo,
  isPromoModalOpen,
  setIsPromoModalOpen
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mx-auto space-y-8 px-4 pb-44 ${ (currentUser.role === 'admin' || currentUser.role === 'manager') ? 'max-w-6xl' : 'max-w-md'}`}
    >
      <div className={`mb-8 ${darkMode ? 'bg-brand-primary p-8 rounded-[2.5rem] shadow-2xl shadow-brand-primary/20 relative overflow-hidden' : ''}`}>
        {darkMode && <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 rounded-full blur-3xl -mr-16 -mt-16" />}
        <h2 className={`text-4xl font-black tracking-tighter mb-2 ${darkMode ? 'text-zinc-900 relative z-10' : 'text-zinc-900'}`}>Promotions & Services</h2>
        <p className={`${darkMode ? 'text-zinc-900/70 relative z-10' : 'text-zinc-500'} text-sm font-medium`}>Download posters to share with your network</p>
      </div>

      { (currentUser.role === 'admin' || currentUser.role === 'manager') && (
        <div className="space-y-12">
          <div className={`flex items-center gap-4 border-b pb-4 ${darkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
            <button 
              onClick={() => setPromoSubTab('manage')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${promoSubTab === 'manage' ? (darkMode ? 'bg-brand-accent text-white' : 'bg-brand-primary text-white') : (darkMode ? 'text-zinc-500' : 'text-zinc-500 hover:bg-zinc-50')}`}
            >
              Manage Services & Promotions
            </button>
          </div>

          <div className={`${darkMode ? 'bg-[#1e293b] border-violet-500' : 'bg-white border-black/5 shadow-sm'} p-8 rounded-[2.5rem] border`}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className={`text-2xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{editingService?.id ? 'Edit Service / Promotion' : 'Add New Service / Promotion'}</h3>
                <p className={`text-sm font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Configure service details, incentives, and marketing materials</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${darkMode ? 'bg-brand-accent text-white shadow-brand-accent/20' : 'bg-rose-500 text-white shadow-brand-accent'}`}>
                <Zap size={24} />
              </div>
            </div>

            <AddServiceForm 
              onSuccess={() => {
                fetchServices();
                setEditingService(null);
              }} 
              onCancel={() => setEditingService(null)}
              initialData={editingService} 
              categories={serviceCategories}
            />
          </div>
          
          <div className={`${darkMode ? 'bg-[#1e293b] border-violet-500' : 'bg-white border-black/5 shadow-sm'} p-8 rounded-[2.5rem] border mt-8`}>
            <div className="space-y-6">
              <label className="block text-xs font-bold text-zinc-500 uppercase ml-1">Existing Services & Promotions</label>
              <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                {services.map(service => (
                  <div key={service.id} className={`p-6 rounded-3xl border transition-all ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-transparent border-zinc-100 hover:border-violet-500'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-zinc-900'}`}>{service.name}</h4>
                          {service.is_featured && <Star size={10} className="text-brand-accent" fill="currentColor" />}
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${service.type === 'Promotion' ? 'bg-brand-accent text-white' : 'bg-brand-primary text-white'}`}>
                            {service.type || 'Service'}
                          </span>
                          {(() => {
                            const status = getServiceStatus(service);
                            return (
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                status === 'active' ? 'bg-emerald-500 text-white' : 
                                status === 'upcoming' ? 'bg-brand-surface text-zinc-900' : 
                                'bg-rose-500 text-white'
                              }`}>
                                {status}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-[10px] text-zinc-500 font-medium line-clamp-1">{service.description || 'No description provided'}</p>
                        {(service.start_date || service.end_date) && (
                          <div className="flex items-center gap-1 mt-1 text-[8px] font-bold text-zinc-500">
                            <Clock size={8} />
                            <span>
                              {(() => {
                                const d = service.start_date;
                                if (!d) return 'Start';
                                if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                                  const [y, m, day] = d.split('-').map(Number);
                                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                  return `${day} ${months[m-1]} ${y}`;
                                }
                                return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                              })()} 
                              {' - '} 
                              {(() => {
                                const d = service.end_date;
                                if (!d) return 'End';
                                if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                                  const [y, m, day] = d.split('-').map(Number);
                                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                  return `${day} ${months[m-1]} ${y}`;
                                }
                                return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => {
                          setEditingService(service);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteService(service.id)} className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Price</p>
                        <p className="text-xs font-bold">{clinicProfile.currency}{service.base_price}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Incentive</p>
                        <p className="text-xs font-bold text-zinc-900">{clinicProfile.currency}{service.commission_rate}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Poster</p>
                        <p className="text-xs font-bold">{service.image_url ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {services.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed border-zinc-100 rounded-3xl">
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">No services configured</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <PromotionDetailModal 
        item={selectedPromo} 
        isOpen={isPromoModalOpen} 
        onClose={() => setIsPromoModalOpen(false)} 
        clinicProfile={clinicProfile}
        darkMode={darkMode}
        currentUser={currentUser}
      />
    </motion.div>
  );
};