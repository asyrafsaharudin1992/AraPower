import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Search, Trash2, Users, DollarSign, Zap, MessageCircle, Info, Save, X, Plus, Image as ImageIcon, Send, RefreshCw, Eye, EyeOff, Edit3, Settings, LayoutDashboard, Megaphone, Calendar } from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';
import BookingCalendar from './BookingCalendar';

export interface AdminUIProps {
  currentUser: any;
  referrals: any[];
  clinicProfile: any;
  staffPerformance: any[];
  activeStaffList: any[];
  staffList: any[];
  warmLeads: any[];
  services: any[];
  branches: any[];
  adminSearch: string;
  setAdminSearch: (search: string) => void;
  handleApproveStaff: (staffId: string, isApproved: boolean) => void;
  handleRejectStaff: (staffId: string) => void;
  handleDeleteStaff: (staffId: string) => void;
  setSelectedStaffDetail: (staff: any) => void;
  setShowStaffModal: (show: boolean) => void;
  handleUpdateWarmLeadStatus: (leadId: string, status: string) => void;
  handleAdminResetPassword: (staffId: string, email: string) => void;
}

export const AdminUI: React.FC<AdminUIProps> = ({
  currentUser,
  referrals,
  clinicProfile,
  staffPerformance,
  activeStaffList,
  staffList,
  warmLeads,
  services,
  branches,
  adminSearch,
  setAdminSearch,
  handleApproveStaff,
  handleRejectStaff,
  handleDeleteStaff,
  setSelectedStaffDetail,
  setShowStaffModal,
  handleUpdateWarmLeadStatus,
  handleAdminResetPassword
}) => {
  const [announcementMsg, setAnnouncementMsg] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'awareness' | 'calendar'>('overview');

  // Awareness Campaigns State
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    description: '',
    caption: '',
    image_url: ''
  });
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    const fetchAnnouncement = async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (!error && data) {
        setAnnouncementMsg(data.message || "");
        setAnnouncementActive(data.is_active || false);
      }
    };
    fetchAnnouncement();
  }, []);

  const fetchCampaigns = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${window.location.origin}/api/marketing-awareness`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (e) {
      console.error(e);
    }
    setRefreshing(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const loadingToast = toast.loading('Uploading poster...');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('posters')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('posters')
        .getPublicUrl(filePath);

      setNewCampaign(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('Poster uploaded successfully!', { id: loadingToast });
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`, { id: loadingToast });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.image_url) {
      toast.error('Please upload a poster first');
      return;
    }

    const loadingToast = toast.loading('Creating campaign...');
    try {
      const res = await fetch(`${window.location.origin}/api/marketing-awareness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: newCampaign.title,
          description: newCampaign.description,
          caption: newCampaign.caption,
          image_url: newCampaign.image_url,
          is_active: true
        })
      });

      if (!res.ok) throw new Error('Create failed');
      
      toast.success('Campaign created successfully!', { id: loadingToast });
      setNewCampaign({ title: '', description: '', caption: '', image_url: '' });
      fetchCampaigns();
    } catch (error: any) {
      toast.error(`Error: ${error.message || 'Error'}`, { id: loadingToast });
    }
  };

  const toggleCampaignActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${window.location.origin}/api/marketing-awareness/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (!res.ok) throw new Error('Update failed');
      setCampaigns(campaigns.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
      toast.success(`Campaign ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error: any) {
      toast.error(`Update failed: ${error.message}`);
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const res = await fetch(`${window.location.origin}/api/marketing-awareness/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete failed');
      setCampaigns(campaigns.filter(c => c.id !== id));
      toast.success('Campaign deleted');
    } catch (error: any) {
      toast.error(`Delete failed: ${error.message}`);
    }
  };

  const handleUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;

    const loadingToast = toast.loading('Updating campaign...');
    try {
      const res = await fetch(`${window.location.origin}/api/marketing-awareness/${editingCampaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingCampaign.title,
          description: editingCampaign.description,
          caption: editingCampaign.caption,
          image_url: editingCampaign.image_url,
          is_active: editingCampaign.is_active
        })
      });

      if (!res.ok) throw new Error('Update failed');
      
      toast.success('Campaign updated successfully!', { id: loadingToast });
      setEditingCampaign(null);
      fetchCampaigns();
    } catch (error: any) {
      toast.error(`Update failed: ${error.message || 'Error'}`, { id: loadingToast });
    }
  };

  const saveAnnouncement = async () => {
    const loadingToast = toast.loading('Saving announcement...');
    const { error } = await supabase
      .from('announcements')
      .update({ message: announcementMsg, is_active: announcementActive })
      .eq('id', 1);
      
    if (error) {
       toast.error(`Error: ${error.message}`, { id: loadingToast });
    } else {
       toast.success('Announcement published', { id: loadingToast });
    }
  };

  const clearAnnouncement = async () => {
    const loadingToast = toast.loading('Clearing announcement...');
    const { error } = await supabase
      .from('announcements')
      .update({ message: '', is_active: false })
      .eq('id', 1);
      
    if (error) {
       toast.error(`Error: ${error.message}`, { id: loadingToast });
    } else {
       setAnnouncementMsg("");
       setAnnouncementActive(false);
       toast.success('Announcement cleared', { id: loadingToast });
    }
  };

  return (
    <motion.div 
      key="admin"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Admin Panel</h2>
          <p className="text-zinc-500 text-sm">Manage clinic operations and staff.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex p-1.5 bg-zinc-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'overview' 
              ? 'bg-white text-[#1580c2] shadow-sm' 
              : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <LayoutDashboard size={14} />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'staff' 
              ? 'bg-white text-[#1580c2] shadow-sm' 
              : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <Users size={14} />
          Staff Management
        </button>
        <button
          onClick={() => setActiveTab('awareness')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'awareness' 
              ? 'bg-white text-[#1580c2] shadow-sm' 
              : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <Megaphone size={14} />
          Awareness Campaigns
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'calendar' 
              ? 'bg-white text-[#1580c2] shadow-sm' 
              : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <Calendar size={14} />
          Booking Calendar
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Global Announcement Section */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black tracking-tighter text-zinc-900">Global Announcement</h3>
                <p className="text-sm text-zinc-500 font-medium">Broadcast a message to all staff dashboards</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                <Info size={24} />
              </div>
            </div>

            <div className="space-y-4">
              <textarea
                value={announcementMsg}
                onChange={(e) => setAnnouncementMsg(e.target.value)}
                placeholder="Type your announcement here..."
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium text-14px resize-none h-24"
              ></textarea>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={announcementActive}
                      onChange={(e) => setAnnouncementActive(e.target.checked)}
                    />
                    <div className={`w-12 h-6 rounded-full transition-colors ${announcementActive ? 'bg-emerald-500' : 'bg-zinc-200 group-hover:bg-zinc-300'}`}></div>
                    <motion.div 
                      className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                      animate={{ x: announcementActive ? 24 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-zinc-900">Display globally</span>
                    <p className="text-xs text-zinc-500">Show banner on all staff dashboards</p>
                  </div>
                </label>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button 
                    onClick={clearAnnouncement}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-full font-bold text-sm bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <X size={16} />
                    Clear
                  </button>
                  <button 
                    onClick={saveAnnouncement}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-full font-bold text-sm bg-brand-primary text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/25"
                  >
                    <Save size={16} />
                    Save Let's Broadcast
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Total Referrals</p>
              <p className="text-3xl font-bold tracking-tight">{referrals.length}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Total Payouts</p>
              <p className="text-3xl font-bold tracking-tight text-zinc-900">
                {clinicProfile.currency}{staffPerformance.reduce((s, staff) => s + (staff.paid_earnings || 0), 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Referral Approvals</p>
              <p className="text-3xl font-bold tracking-tight text-zinc-900">
                {referrals.filter(r => r.status === 'payment_made').length}
              </p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Staff Approvals</p>
              <p className="text-3xl font-bold tracking-tight text-zinc-900">
                {activeStaffList.filter(s => !s.is_approved && s.employment_status !== 'rejected').length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Staff Tab Content */}
      {activeTab === 'staff' && (
        <div className="space-y-8">
          {/* Staff Approvals Section */}
          {activeStaffList.filter(s => !s.is_approved && s.employment_status !== 'rejected').length > 0 && (
            <div className="bg-brand-primary rounded-[2.5rem] border border-brand-primary p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black tracking-tighter text-zinc-900">Pending Staff Approvals</h3>
                  <p className="text-sm text-zinc-900 font-medium">Review and approve new staff registrations</p>
                </div>
                <div className="w-12 h-12 bg-brand-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary">
                  <ShieldCheck size={24} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeStaffList.filter(s => !s.is_approved && s.employment_status !== 'rejected').map(staff => (
                  <div key={staff.id} className="bg-white p-6 rounded-3xl border border-brand-primary shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-lg font-black text-zinc-500">
                        {staff?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900">{staff.name}</h4>
                        <p className="text-xs text-zinc-500 font-medium">{staff.email}</p>
                      </div>
                    </div>
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        <span>Branch</span>
                        <span className="text-zinc-900">{staff.branch}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        <span>Phone</span>
                        <span className="text-zinc-900">{staff.phone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        <span>Joined</span>
                        <span className="text-zinc-900">{staff.date_joined ? new Date(staff.date_joined).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApproveStaff(staff.id, true)}
                        className="flex-1 bg-gradient-to-r from-violet-500 to-rose-500 text-zinc-900 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:from-violet-500 hover:to-rose-500 transition-all shadow-lg shadow-violet-500"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleRejectStaff(staff.id)}
                        className="px-4 bg-rose-500 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff Performance Analytics */}
          <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-semibold">Staff Performance Analytics</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                <input 
                  type="text"
                  placeholder="Search staff name..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-64"
                />
              </div>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">No.</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Staff Member</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Current Tier</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-center">Monthly Success</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Total Earned (Incl. Bonus)</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {staffPerformance
                  .filter(staff => staff.name.toLowerCase().includes(adminSearch.toLowerCase()))
                  .map((staff, index) => (
                  <tr 
                    key={staff.id} 
                    className="hover:bg-zinc-50/50 transition-colors cursor-pointer group"
                    onClick={() => {
                      setSelectedStaffDetail(staff);
                      setShowStaffModal(true);
                    }}
                  >
                    <td className="p-4 text-sm text-zinc-500 font-medium">{index + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-xs font-bold text-zinc-500">
                          {staff.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{staff.name}</span>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{staff.branch}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${staff.tier?.bg || 'bg-zinc-50'} ${staff.tier?.color || 'text-zinc-500'}`}>
                        {staff.tier?.name || 'Bronze'}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-semibold text-center">{staff.monthlySuccessfulRefs}</td>
                    <td className="p-4 text-sm font-bold text-right text-zinc-900">
                      {clinicProfile.currency}{(staff.earned || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStaff(staff.id);
                        }}
                        className="p-2 text-zinc-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Staff"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Awareness Tab Content */}
      {activeTab === 'awareness' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Campaign Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                  <Plus size={20} />
                </div>
                <h3 className="text-xl font-black tracking-tighter text-zinc-900">New Campaign</h3>
              </div>

              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Title</label>
                  <input 
                    type="text"
                    required
                    value={newCampaign.title}
                    onChange={e => setNewCampaign({...newCampaign, title: e.target.value})}
                    placeholder="e.g. Breast Cancer Awareness"
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Description (Internal)</label>
                  <textarea 
                    required
                    value={newCampaign.description}
                    onChange={e => setNewCampaign({...newCampaign, description: e.target.value})}
                    placeholder="Details for staff members..."
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium text-sm h-24 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Social Media Caption</label>
                  <textarea 
                    required
                    value={newCampaign.caption}
                    onChange={e => setNewCampaign({...newCampaign, caption: e.target.value})}
                    placeholder="What users will copy/share..."
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium text-sm h-32 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Campaign Poster</label>
                  <div className="relative group">
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      disabled={isUploading}
                    />
                    <div className={`w-full aspect-video rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-4 gap-2 ${
                      newCampaign.image_url 
                        ? 'border-emerald-200 bg-emerald-50' 
                        : 'border-zinc-200 bg-zinc-50 group-hover:border-violet-300 group-hover:bg-violet-50'
                    }`}>
                      {newCampaign.image_url ? (
                        <img src={newCampaign.image_url} alt="Preview" className="w-full h-full object-contain rounded-xl" />
                      ) : (
                        <>
                          <ImageIcon className="text-zinc-400 group-hover:text-violet-500 transition-colors" size={32} />
                          <span className="text-xs font-bold text-zinc-500 group-hover:text-violet-600">
                            {isUploading ? 'Uploading...' : 'Click or drop poster here'}
                          </span>
                        </>
                      )}
                    </div>
                    {newCampaign.image_url && (
                      <button 
                        type="button"
                        onClick={() => setNewCampaign({...newCampaign, image_url: ''})}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center text-rose-500 z-20"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isUploading}
                  className="w-full py-4 rounded-2xl bg-zinc-900 text-white font-black uppercase tracking-widest text-[10px] hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  Launch Campaign
                </button>
              </form>
            </div>
          </div>

          {/* Existing Campaigns List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-black/5 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <Zap size={20} />
                  </div>
                  <h3 className="text-xl font-black tracking-tighter text-zinc-900">Active Campaigns</h3>
                </div>
                <button 
                  onClick={fetchCampaigns}
                  className={`p-2 text-zinc-400 hover:text-zinc-600 transition-all ${refreshing ? 'animate-spin' : ''}`}
                >
                  <RefreshCw size={20} />
                </button>
              </div>

              {campaigns.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-zinc-400">
                  <div className="w-16 h-16 bg-zinc-50 rounded-3xl flex items-center justify-center mb-4">
                    <ImageIcon size={32} className="opacity-20" />
                  </div>
                  <p className="font-bold text-sm">No awareness campaigns Yet.</p>
                  <p className="text-xs">Create your first campaign to boost engagement.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {campaigns.map(campaign => (
                    <div 
                      key={campaign.id} 
                      className={`group relative bg-zinc-50 rounded-[2rem] border border-zinc-100 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 ${!campaign.is_active ? 'opacity-75 grayscale-[0.5]' : ''}`}
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
                        <div className="absolute top-4 right-4 flex gap-2">
                          <button 
                            onClick={() => setEditingCampaign(campaign)}
                            className="w-10 h-10 bg-white text-zinc-400 rounded-xl shadow-lg flex items-center justify-center hover:text-[#1580c2] transition-all"
                            title="Edit Campaign"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            onClick={() => deleteCampaign(campaign.id)}
                            className="w-10 h-10 bg-white text-rose-500 rounded-xl shadow-lg flex items-center justify-center hover:bg-rose-50 transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        {!campaign.is_active && (
                          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="px-4 py-2 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">Inactive</span>
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-black text-zinc-900 line-clamp-1">{campaign.title}</h4>
                          <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative">
                              <input 
                                type="checkbox" 
                                className="sr-only" 
                                checked={campaign.is_active}
                                onChange={() => toggleCampaignActive(campaign.id, campaign.is_active)}
                              />
                              <div className={`w-10 h-5 rounded-full transition-colors ${campaign.is_active ? 'bg-emerald-500' : 'bg-zinc-300'}`}></div>
                              <motion.div 
                                className="absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm"
                                animate={{ x: campaign.is_active ? 20 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                              {campaign.is_active ? 'Active' : 'Draft'}
                            </span>
                          </label>
                        </div>
                        <p className="text-xs text-zinc-500 font-medium mb-4 line-clamp-2">{campaign.description}</p>
                        
                        <div className="bg-white/50 border border-zinc-200 rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageCircle size={14} className="text-[#1580c2]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#1580c2]">Caption preview</span>
                          </div>
                          <p className="text-[10px] font-medium text-zinc-600 line-clamp-3 leading-relaxed italic">"{campaign.caption}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm overflow-hidden h-[800px] flex flex-col">
          <BookingCalendar 
            currentUser={currentUser}
            referrals={referrals}
            staffList={staffList}
            clinicProfile={clinicProfile}
            branches={branches}
          />
        </div>
      )}

      {/* Edit Campaign Modal */}
      {editingCampaign && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingCampaign(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
          >
            <div className="bg-zinc-900 p-8 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Edit3 size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Edit Campaign</h3>
                  <p className="text-zinc-500 text-sm">Update campaign details and assets</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingCampaign(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateCampaign} className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Title</label>
                  <input 
                    type="text"
                    required
                    value={editingCampaign.title}
                    onChange={e => setEditingCampaign({...editingCampaign, title: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Description (Internal)</label>
                  <textarea 
                    required
                    value={editingCampaign.description}
                    onChange={e => setEditingCampaign({...editingCampaign, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium text-sm h-24 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Social Media Caption</label>
                  <textarea 
                    required
                    value={editingCampaign.caption}
                    onChange={e => setEditingCampaign({...editingCampaign, caption: e.target.value})}
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium text-sm h-32 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${editingCampaign.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {editingCampaign.is_active ? <Eye size={20} /> : <EyeOff size={20} />}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-zinc-900">Campaign Status</p>
                      <p className="text-[10px] font-medium text-zinc-500">{editingCampaign.is_active ? 'Visible to all staff' : 'Hidden from staff'}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={editingCampaign.is_active}
                      onChange={(e) => setEditingCampaign({...editingCampaign, is_active: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setEditingCampaign(null)}
                  className="flex-1 py-4 rounded-2xl bg-zinc-100 text-zinc-500 font-black uppercase tracking-widest text-[10px] hover:bg-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-2 py-4 rounded-2xl bg-[#1580c2] text-white font-black uppercase tracking-widest text-[10px] hover:opacity-90 transition-opacity shadow-lg shadow-[#1580c2]/20"
                >
                  Update Campaign
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </motion.div>
  );
};
