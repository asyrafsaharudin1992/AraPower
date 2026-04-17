import React from 'react';
import { motion } from 'motion/react';
import { Zap, Star, Clock, Edit2, Trash2 } from 'lucide-react';
import { ModernPromotionCard } from './ModernPromotionCard';
import { PromotionsCarousel } from './PromotionsCarousel';
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
  const blue = '#1580c2';
  const P = "'Poppins', sans-serif";

  const cardStyle: React.CSSProperties = {
    background: blue, borderRadius: '2rem', border: 'none', padding: '32px', position: 'relative', overflow: 'hidden',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '10px', fontWeight: 600, color: '#ffffff', opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px',
  };
  const valueStyle: React.CSSProperties = {
    fontSize: '13px', fontWeight: 600, color: '#ffffff',
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      active:    { bg: 'rgba(255,255,255,0.9)', color: blue },
      upcoming:  { bg: 'rgba(255,255,255,0.25)', color: '#ffffff' },
      expired:   { bg: 'rgba(239,68,68,0.25)', color: '#fca5a5' },
    };
    const s = map[status] || map.expired;
    return (
      <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: s.bg, color: s.color }}>
        {status}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ fontFamily: P }}
      className={`mx-auto space-y-8 px-4 pb-44 ${(currentUser.role === 'admin' || currentUser.role === 'manager') ? 'max-w-6xl' : 'max-w-md'}`}
    >
      {/* ── Header ── */}
      <div className="mb-8">
        <h2 style={{ fontSize: '32px', fontWeight: 700, color: blue, letterSpacing: '-0.5px', margin: '0 0 6px 0' }}>
          Promotions & Services
        </h2>
        <p style={{ fontSize: '14px', fontWeight: 400, color: blue, opacity: 0.55, margin: 0 }}>
          Download posters to share with your network
        </p>
      </div>

      {/* ── Admin / Manager view ── */}
      {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
        <div className="space-y-12">
          {/* Tab bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: `1.5px solid rgba(21,128,194,0.15)`, paddingBottom: '16px' }}>
            <button
              onClick={() => setPromoSubTab('manage')}
              style={{
                padding: '8px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, fontFamily: P, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                background: promoSubTab === 'manage' ? blue : 'transparent',
                color: promoSubTab === 'manage' ? '#ffffff' : blue,
              }}
            >
              Manage Services & Promotions
            </button>
          </div>

          {/* Add / Edit Service panel */}
          <div style={cardStyle}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', transform: 'translate(40%, -40%)' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', position: 'relative', zIndex: 1 }}>
              <div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px 0' }}>
                  {editingService?.id ? 'Edit Service / Promotion' : 'Add New Service / Promotion'}
                </h3>
                <p style={{ fontSize: '13px', fontWeight: 400, color: '#ffffff', opacity: 0.65, margin: 0 }}>
                  Configure service details, incentives, and marketing materials
                </p>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Zap size={22} color="white" />
              </div>
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <AddServiceForm
                onSuccess={() => { fetchServices(); setEditingService(null); }}
                onCancel={() => setEditingService(null)}
                initialData={editingService}
                categories={serviceCategories}
              />
            </div>
          </div>

          {/* Existing Services list */}
          <div style={cardStyle}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', transform: 'translate(40%, -40%)' }} />
            <div className="space-y-6" style={{ position: 'relative', zIndex: 1 }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#ffffff', opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Existing Services & Promotions
              </label>
              <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                {services.map(service => (
                  <div key={service.id} style={{ padding: '20px', borderRadius: '1.5rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', transition: 'background 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', margin: 0 }}>{service.name}</h4>
                          {service.is_featured && <Star size={10} color="rgba(255,255,255,0.8)" fill="rgba(255,255,255,0.8)" />}
                          <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
                            {service.type || 'Service'}
                          </span>
                          {statusBadge(getServiceStatus(service))}
                        </div>
                        <p style={{ fontSize: '10px', fontWeight: 500, color: '#ffffff', opacity: 0.6, margin: 0 }}>{service.description || 'No description provided'}</p>
                        {(service.start_date || service.end_date) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '8px', fontWeight: 600, color: '#ffffff', opacity: 0.55 }}>
                            <Clock size={8} />
                            <span>
                              {(() => {
                                const d = service.start_date;
                                if (!d) return 'Start';
                                if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                                  const [y, m, day] = d.split('-').map(Number);
                                  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
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
                                  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                  return `${day} ${months[m-1]} ${y}`;
                                }
                                return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => { setEditingService(service); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          style={{ padding: '6px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', transition: 'color 0.15s' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#ffffff')}
                          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)')}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteService(service.id)}
                          style={{ padding: '6px', color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', transition: 'color 0.15s' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#fca5a5')}
                          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)')}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      {[
                        { label: 'Price', val: `${clinicProfile.currency}${service.base_price}` },
                        { label: 'Incentive', val: `${clinicProfile.currency}${service.commission_rate}` },
                        { label: 'Poster', val: service.image_url ? 'Yes' : 'No' },
                      ].map(({ label, val }) => (
                        <div key={label}>
                          <p style={labelStyle}>{label}</p>
                          <p style={valueStyle}>{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {services.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '48px 0', border: '1.5px dashed rgba(255,255,255,0.25)', borderRadius: '1.5rem' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.15em', margin: 0 }}>No services configured</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Affiliate / Staff carousel view ── */}
      {currentUser.role !== 'admin' && currentUser.role !== 'manager' && currentUser.role !== 'receptionist' && (
        <div className="space-y-12">
          {[
            { title: 'Featured', filter: (s: any) => s.is_featured && checkBranchAccess(s) },
            ...serviceCategories.map(cat => ({
              title: cat,
              filter: (s: any) => {
                const sCat = (s.category || '').trim().toLowerCase();
                const targetCat = cat.trim().toLowerCase();
                return sCat === targetCat && checkBranchAccess(s);
              }
            }))
          ].map((category, idx) => {
            const displayServices = services.length > 0 ? services : promotions.map(p => ({
              id: p.id, name: p.title, description: p.description,
              start_date: p.start_date, end_date: p.end_date, type: 'Promotion',
              base_price: 0, commission_rate: 0, is_featured: true, allowances: {}, branches: {}
            }));

            let filteredServices = displayServices.filter(item => checkBranchAccess(item) && category.filter(item));

            if (filteredServices.length === 0) {
              filteredServices = [
                { id: 'coming-soon-1', name: `${category.title} Coming Soon`, base_price: 0, commission_rate: 0, allowances: {}, category: category.title, type: 'Service', description: 'Stay tuned for more services in this category.' },
                { id: 'coming-soon-2', name: 'More info coming', base_price: 0, commission_rate: 0, allowances: {}, category: category.title, type: 'Service', description: 'We are working on adding new services.' },
              ];
            }

            return (
              <div key={idx} className="space-y-6">
                <h3 style={{ fontSize: '22px', fontWeight: 700, color: blue, margin: '0 0 4px 0' }}>
                  {category.title}
                </h3>
                {isMobile ? (
                  <PromotionsCarousel
                    size={idx === 0 ? 'large' : 'small'}
                    items={filteredServices}
                    onClick={(item) => {
                      if (typeof item.id === 'string' && !item.id.startsWith('coming-soon')) {
                        setSelectedPromo(item);
                        setIsPromoModalOpen(true);
                      }
                    }}
                  />
                ) : (
                  <div className="flex overflow-x-auto gap-6 pb-4 px-2 scrollbar-hide flex-nowrap">
                    {filteredServices.map((item) => (
                      <div key={item.id} className="flex-shrink-0 w-[3.2rem] h-[4rem] flex flex-col gap-2">
                        <div className="scale-[0.2] origin-top-left">
                          <ModernPromotionCard
                            item={item}
                            onClick={() => {
                              if (typeof item.id === 'string' && !item.id.startsWith('coming-soon')) {
                                setSelectedPromo(item);
                                setIsPromoModalOpen(true);
                              }
                            }}
                          />
                        </div>
                        <div className="px-1">
                          <h4 style={{ fontSize: '6px', fontWeight: 700, color: blue, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</h4>
                          <p style={{ fontSize: '5px', fontWeight: 500, color: blue, opacity: 0.6, margin: 0 }}>
                            {item.promo_price ? `RM${item.promo_price}` : `RM${item.base_price || 0}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {(services.length > 0 ? services : promotions).filter((item: any) => {
            return !item.branches ||
              (Array.isArray(item.branches) && (item.branches.length === 0 || !currentUser.branch || item.branches.includes(currentUser.branch))) ||
              (!Array.isArray(item.branches) && (Object.keys(item.branches).length === 0 || !currentUser.branch || (item.branches[currentUser.branch] && item.branches[currentUser.branch].active)));
          }).length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '1.5rem', background: `${blue}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Zap size={28} color={blue} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: blue, margin: '0 0 6px 0' }}>No active promotions</h3>
              <p style={{ fontSize: '14px', fontWeight: 400, color: blue, opacity: 0.55, margin: 0 }}>Check back later for exciting new offers!</p>
            </div>
          )}
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