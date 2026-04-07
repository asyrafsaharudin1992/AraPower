import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase'; // Adjusted to match your actual Supabase setup file path
import { X, Plus, Calendar, Clock, Upload, Trash2, Image as ImageIcon, Check, MapPin } from 'lucide-react';

const safeFetch = async (url: string, options?: RequestInit, retries = 3, backoff = 1000): Promise<{ res: Response, data: any }> => {
  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok && retries > 0 && (res.status >= 500 || res.status === 429)) {
      await new Promise(r => setTimeout(r, backoff));
      return safeFetch(url, options, retries - 1, backoff * 2);
    }
    return { res, data };
  } catch (error) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, backoff));
      return safeFetch(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
};

type BlockedDate = {
  id: string;
  date: string;
  type: 'all-day' | 'time-range';
  startTime?: string;
  endTime?: string;
};

type BranchSchedule = {
  active: boolean;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  days: string[];
  limitBookings: boolean;
  maxSlots: number;
  blockedDates: BlockedDate[];
};

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface AddServiceFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
  categories?: string[];
}

const AddServiceForm: React.FC<AddServiceFormProps> = ({ onSuccess, onCancel, initialData, categories = [] }) => {
  // --- CARD 1: Basic Details & Rules ---
  const [customId, setCustomId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'Standard Service' | '☆ Promo'>('Standard Service');
  const [visibility, setVisibility] = useState<'Public' | 'New Patients Only' | 'Hidden (VIP Link)'>('Public');
  const [category, setCategory] = useState(categories.length > 0 ? categories[0] : 'Cosmetic Dentistry');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState(initialData?.target_url || '');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // --- CARD 2: Branch-Specific Scheduling ---
  const [duration, setDuration] = useState('30 Mins');
  const [branches, setBranches] = useState<Record<string, BranchSchedule>>({
    'HQ': { active: false, startDate: '', endDate: '', startTime: '09:00', endTime: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], limitBookings: false, maxSlots: 10, blockedDates: [] },
    'Kajang': { active: false, startDate: '', endDate: '', startTime: '09:00', endTime: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], limitBookings: false, maxSlots: 10, blockedDates: [] },
    'Semenyih': { active: false, startDate: '', endDate: '', startTime: '09:00', endTime: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], limitBookings: false, maxSlots: 10, blockedDates: [] },
    'Seri Kembangan': { active: false, startDate: '', endDate: '', startTime: '09:00', endTime: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], limitBookings: false, maxSlots: 10, blockedDates: [] },
  });

  // --- CARD 3: Pricing, Deposits & Rewards ---
  const [overallLimitEnabled, setOverallLimitEnabled] = useState(false);
  const [overallLimit, setOverallLimit] = useState(50);
  const [basePrice, setBasePrice] = useState('');
  const [promoPrice, setPromoPrice] = useState('');
  const [requireDeposit, setRequireDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [staffIncentive, setStaffIncentive] = useState('');
  const [aracoinsPerk, setAracoinsPerk] = useState('');
  const [tierBronze, setTierBronze] = useState('');
  const [tierSilver, setTierSilver] = useState('');
  const [tierGold, setTierGold] = useState('');

  // --- CARD 4: App Display & Media ---
  const [posterUrl, setPosterUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [topFeatured, setTopFeatured] = useState(false);
  const [categoryCarousel, setCategoryCarousel] = useState(true);
  const [isAraPowerLinked, setIsAraPowerLinked] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [existingServices, setExistingServices] = useState<any[]>([]);

  // --- Fetch Existing Offers (As requested) ---
  useEffect(() => {
    const getOffers = async () => {
      try {
        const { res, data } = await safeFetch('/api/services');
        if (!res.ok) throw new Error(data?.message || 'Failed to fetch services');
        
        setExistingServices(data || []);
        console.log("Services data loaded from API:", data);
      } catch (error: any) {
        console.error("API fetch error:", error.message);
      }
    }
    getOffers();
  }, []);

  // --- Handlers ---

  useEffect(() => {
    if (initialData) {
      setCustomId(initialData.id || '');
      setName(initialData.name || '');
      setType(initialData.type === 'Promotion' ? '☆ Promo' : 'Standard Service');
      setVisibility(initialData.visibility || 'Public');
      setCategory(initialData.category || (categories.length > 0 ? categories[0] : 'Cosmetic Dentistry'));
      setDescription(initialData.description || '');
      setTargetUrl(initialData.target_url || '');
      setTags(initialData.tags || []);
      setDuration(initialData.duration || '30 Mins');
      if (initialData.branches) setBranches(initialData.branches);
      setOverallLimitEnabled(initialData.overall_limit_enabled || false);
      setOverallLimit(initialData.overall_limit || 50);
      setBasePrice(initialData.base_price ? String(initialData.base_price) : '');
      setPromoPrice(initialData.promo_price ? String(initialData.promo_price) : '');
      setRequireDeposit(initialData.require_deposit || false);
      setDepositAmount(initialData.deposit_amount ? String(initialData.deposit_amount) : '');
      setStaffIncentive(initialData.commission_rate ? String(initialData.commission_rate) : '');
      setAracoinsPerk(initialData.aracoins_perk ? String(initialData.aracoins_perk) : '');
      if (initialData.allowances) {
        setTierBronze(initialData.allowances.bronze ? String(initialData.allowances.bronze) : '');
        setTierSilver(initialData.allowances.silver ? String(initialData.allowances.silver) : '');
        setTierGold(initialData.allowances.gold ? String(initialData.allowances.gold) : '');
      }
      setPosterUrl(initialData.image_url || '');
      setTopFeatured(initialData.is_featured || false);
      setCategoryCarousel(initialData.category_carousel || false);
      setIsAraPowerLinked(initialData.is_arapower_linked !== undefined ? initialData.is_arapower_linked : true);
    } else {
      // Reset form
      setCustomId('');
      setName('');
      setType('Standard Service');
      setVisibility('Public');
      setCategory(categories.length > 0 ? categories[0] : 'Cosmetic Dentistry');
      setDescription('');
      setTargetUrl('');
      setTags([]);
      setDuration('30 Mins');
      setBranches({
        'HQ': { active: false, startDate: '', endDate: '', startTime: '09:00', endTime: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], limitBookings: false, maxSlots: 10, blockedDates: [] },
        'Kajang': { active: false, startDate: '', endDate: '', startTime: '09:00', endTime: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], limitBookings: false, maxSlots: 10, blockedDates: [] },
        'Semenyih': { active: false, startDate: '', endDate: '', startTime: '09:00', endTime: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], limitBookings: false, maxSlots: 10, blockedDates: [] },
        'Seri Kembangan': { active: false, startDate: '', endDate: '', startTime: '09:00', endTime: '18:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], limitBookings: false, maxSlots: 10, blockedDates: [] },
      });
      setOverallLimitEnabled(false);
      setOverallLimit(50);
      setBasePrice('');
      setPromoPrice('');
      setRequireDeposit(false);
      setDepositAmount('');
      setStaffIncentive('');
      setAracoinsPerk('');
      setTierBronze('');
      setTierSilver('');
      setTierGold('');
      setPosterUrl('');
      setTopFeatured(false);
      setCategoryCarousel(false);
      setIsAraPowerLinked(true);
    }
  }, [initialData]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const updateBranch = (branchName: string, field: keyof BranchSchedule, value: any) => {
    setBranches(prev => ({
      ...prev,
      [branchName]: { ...prev[branchName], [field]: value }
    }));
  };

  const toggleBranchDay = (branchName: string, day: string) => {
    setBranches(prev => {
      const branch = prev[branchName];
      const newDays = branch.days.includes(day)
        ? branch.days.filter(d => d !== day)
        : [...branch.days, day];
      return { ...prev, [branchName]: { ...branch, days: newDays } };
    });
  };

  const addBlockedDate = (branchName: string) => {
    const newBlockedDate: BlockedDate = {
      id: Math.random().toString(36).substr(2, 9),
      date: '',
      type: 'all-day'
    };
    setBranches(prev => ({
      ...prev,
      [branchName]: { ...prev[branchName], blockedDates: [...prev[branchName].blockedDates, newBlockedDate] }
    }));
  };

  const updateBlockedDate = (branchName: string, id: string, field: keyof BlockedDate, value: any) => {
    setBranches(prev => ({
      ...prev,
      [branchName]: {
        ...prev[branchName],
        blockedDates: prev[branchName].blockedDates.map(bd => bd.id === id ? { ...bd, [field]: value } : bd)
      }
    }));
  };

  const removeBlockedDate = (branchName: string, id: string) => {
    setBranches(prev => ({
      ...prev,
      [branchName]: {
        ...prev[branchName],
        blockedDates: prev[branchName].blockedDates.filter(bd => bd.id !== id)
      }
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('posters')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('posters')
        .getPublicUrl(data.path);
      
      setPosterUrl(urlData.publicUrl);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAutoFill = async () => {
    if (!targetUrl) return;
    setIsAutoFilling(true);
    try {
      const { res, data } = await safeFetch('/api/import-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });

      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Failed to auto-fill from website');
      }

      if (data.name) setName(data.name);
      if (data.description) setDescription(data.description);
      if (data.price) setBasePrice(String(data.price));
      if (data.image) setPosterUrl(data.image);
      
      alert('✨ Magic Import successful!');
    } catch (error: any) {
      console.error('Auto-fill error:', error);
      alert(`Magic Import failed: ${error.message}`);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleSubmit = async () => {
    if (!initialData && !customId.trim()) {
      alert('Please enter the Website Service ID.');
      return;
    }
    if (!name.trim()) {
      alert('Please enter a Name/Title for the service.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name,
        type: type === 'Standard Service' ? 'Service' : 'Promotion',
        visibility,
        category,
        description,
        target_url: targetUrl,
        tags,
        duration,
        branches, // Backend expects 'branches' which it will stringify to the 'branches' column
        overall_limit_enabled: overallLimitEnabled,
        overall_limit: overallLimitEnabled ? overallLimit : null,
        base_price: basePrice ? parseFloat(basePrice) : null,
        promo_price: promoPrice ? parseFloat(promoPrice) : null,
        require_deposit: requireDeposit,
        deposit_amount: requireDeposit && depositAmount ? parseFloat(depositAmount) : null,
        commission_rate: staffIncentive ? parseFloat(staffIncentive) : 0,
        aracoins_perk: aracoinsPerk ? parseInt(aracoinsPerk) : null,
        allowances: {
          bronze: tierBronze ? parseFloat(tierBronze) : 0,
          silver: tierSilver ? parseFloat(tierSilver) : 0,
          gold: tierGold ? parseFloat(tierGold) : 0,
        },
        image_url: posterUrl,
        is_featured: topFeatured,
        category_carousel: categoryCarousel,
        is_arapower_linked: isAraPowerLinked,
      };

      if (!initialData) {
        payload.id = customId.trim();
      }

      const url = initialData?.id ? `/api/services/${initialData.id}` : `/api/services`;
      const method = initialData?.id ? 'PATCH' : 'POST';
      
      const { res, data } = await safeFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(data?.message || data?.error || 'Failed to save service');
      }

      alert(initialData?.id ? 'Service updated successfully!' : 'Service saved and published successfully!');
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error saving service:', error);
      alert(`Failed to save service: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-sans text-gray-800">
      <div className="w-full">
        {/* 2-Column Grid: Left 60% (col-span-7), Right 40% (col-span-5) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* CARD 1: Basic Details & Rules */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                Basic Details & Rules
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">WEBSITE SERVICE ID *</label>
                  <input 
                    type="text" 
                    value={customId} 
                    onChange={(e) => setCustomId(e.target.value)} 
                    placeholder="e.g. x0CgMhr8yT0Re82KnTkB" 
                    disabled={!!initialData}
                    className={`w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition ${!!initialData ? 'bg-gray-50 cursor-not-allowed text-gray-500' : ''}`} 
                  />
                  <p className="mt-1 text-[10px] text-gray-400">Paste the unique alphanumeric ID from the external website URL (e.g., x0CgMhr8yT0Re82KnTkB).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">NAME / TITLE *</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="e.g. Merdeka Whitening Promo" 
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">TYPE</label>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                      {(['Standard Service', '☆ Promo'] as const).map(t => (
                        <button 
                          key={t}
                          onClick={() => setType(t)} 
                          className={`flex-1 py-2 rounded-md text-sm font-medium transition ${type === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">CATEGORY</label>
                    <select 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value)} 
                      className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                    >
                      {categories.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                      {categories.length === 0 && (
                        <>
                          <option>Cosmetic Dentistry</option>
                          <option>General Dentistry</option>
                          <option>Orthodontics</option>
                          <option>Surgery</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 mb-3">BOOKING SYSTEM</label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div 
                      onClick={() => setIsAraPowerLinked(!isAraPowerLinked)}
                      className={`w-12 h-6 rounded-full transition-all relative ${isAraPowerLinked ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isAraPowerLinked ? 'left-7' : 'left-1'}`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-700">Linked to AraPower Booking</span>
                      <span className="text-[10px] text-gray-500">Enable this if the service is listed on your booking system.</span>
                    </div>
                  </label>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 mb-3">VISIBILITY (WHO CAN BOOK THIS?)</label>
                  <div className="flex flex-wrap gap-4">
                    {(['Public', 'New Patients Only', 'Hidden (VIP Link)'] as const).map(v => (
                      <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input 
                          type="radio" 
                          name="visibility" 
                          checked={visibility === v} 
                          onChange={() => setVisibility(v)} 
                          className="accent-indigo-600 w-4 h-4" 
                        />
                        <span className="font-medium text-gray-700">{v}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">DESCRIPTION & T&C</label>
                  <textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Add details, terms, and conditions here..." 
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm h-24 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">TARGET WEBSITE URL (OPTIONAL)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={targetUrl} 
                      onChange={(e) => setTargetUrl(e.target.value)} 
                      placeholder="https://klinikara24jam.hsohealthcare.com/share?service=..." 
                      className="flex-1 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" 
                    />
                    <button
                      onClick={handleAutoFill}
                      disabled={!targetUrl || isAutoFilling}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 whitespace-nowrap ${
                        !targetUrl || isAutoFilling
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                      }`}
                    >
                      {isAutoFilling ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Importing...
                        </>
                      ) : (
                        '✨ Auto-Fill from Website'
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">SPECIAL FEATURES / TAGS</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map(tag => (
                      <span key={tag} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-semibold flex items-center gap-1">
                        {tag} 
                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-indigo-900 focus:outline-none p-0.5 rounded-full hover:bg-indigo-200 transition">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newTag} 
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      placeholder="e.g. Female Doctor Only, X-Ray Required..." 
                      className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                    />
                    <button 
                      onClick={handleAddTag} 
                      className="bg-gray-100 px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-200 transition"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: Branch-Specific Scheduling */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                  Branch-Specific Scheduling
                </h2>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-500">DURATION:</label>
                  <select 
                    value={duration} 
                    onChange={(e) => setDuration(e.target.value)} 
                    className="border border-gray-200 rounded-lg p-1.5 text-sm outline-none font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    {['15 Mins', '30 Mins', '45 Mins', '60 Mins', '90 Mins', '120 Mins'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 mb-3">PARTICIPATING BRANCHES</label>
                <div className="flex flex-wrap gap-3">
                  {Object.keys(branches).map(branchName => {
                    const isActive = branches[branchName].active;
                    return (
                      <button
                        key={branchName}
                        onClick={() => updateBranch(branchName, 'active', !isActive)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition flex items-center gap-2 ${
                          isActive 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                            : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${isActive ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                          {isActive && <Check size={12} className="text-white" />}
                        </div>
                        {branchName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Branch Settings */}
              <div className="space-y-4 mt-6">
                {Object.entries(branches).map(([branchName, schedule]) => {
                  if (!schedule.active) return null;
                  
                  return (
                    <div key={branchName} className="border border-indigo-100 bg-indigo-50/30 rounded-xl p-5">
                      <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                        <MapPin size={16} className="text-indigo-500" />
                        {branchName} Settings
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">CAMPAIGN DATES</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="date" 
                              value={schedule.startDate} 
                              onChange={(e) => updateBranch(branchName, 'startDate', e.target.value)}
                              className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500" 
                            />
                            <span className="text-gray-400">to</span>
                            <input 
                              type="date" 
                              value={schedule.endDate} 
                              onChange={(e) => updateBranch(branchName, 'endDate', e.target.value)}
                              className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500" 
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">DAILY HOURS</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="time" 
                              value={schedule.startTime} 
                              onChange={(e) => updateBranch(branchName, 'startTime', e.target.value)}
                              className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500" 
                            />
                            <span className="text-gray-400">to</span>
                            <input 
                              type="time" 
                              value={schedule.endTime} 
                              onChange={(e) => updateBranch(branchName, 'endTime', e.target.value)}
                              className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500" 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-500 mb-2">OPERATING DAYS</label>
                        <div className="flex flex-wrap gap-2">
                          {DAYS_OF_WEEK.map(day => {
                            const isSelected = schedule.days.includes(day);
                            return (
                              <button
                                key={day}
                                onClick={() => toggleBranchDay(branchName, day)}
                                className={`w-10 h-10 rounded-full text-xs font-bold transition ${
                                  isSelected 
                                    ? 'bg-indigo-600 text-white shadow-md' 
                                    : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-4 bg-white p-3 rounded-lg border border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={schedule.limitBookings}
                            onChange={(e) => updateBranch(branchName, 'limitBookings', e.target.checked)}
                            className="w-4 h-4 accent-indigo-600 rounded" 
                          />
                          <span className="text-sm font-semibold text-gray-700">Limit Max Slots</span>
                        </label>
                        {schedule.limitBookings && (
                          <input 
                            type="number" 
                            value={schedule.maxSlots}
                            onChange={(e) => updateBranch(branchName, 'maxSlots', parseInt(e.target.value) || 0)}
                            className="w-20 border border-gray-200 rounded-lg p-1.5 text-sm outline-none focus:border-indigo-500" 
                            placeholder="Qty"
                          />
                        )}
                      </div>

                      {/* Blocked Dates */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-xs font-bold text-gray-500">BLOCKED DATES / TIMES</label>
                          <button 
                            onClick={() => addBlockedDate(branchName)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            <Plus size={14} /> Add Block
                          </button>
                        </div>
                        
                        {schedule.blockedDates.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No blocked dates configured.</p>
                        ) : (
                          <div className="space-y-2">
                            {schedule.blockedDates.map((bd) => (
                              <div key={bd.id} className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-white p-2 rounded-lg border border-gray-200">
                                <input 
                                  type="date" 
                                  value={bd.date}
                                  onChange={(e) => updateBlockedDate(branchName, bd.id, 'date', e.target.value)}
                                  className="border border-gray-200 rounded-md p-1.5 text-sm outline-none focus:border-indigo-500" 
                                />
                                <select 
                                  value={bd.type}
                                  onChange={(e) => updateBlockedDate(branchName, bd.id, 'type', e.target.value)}
                                  className="border border-gray-200 rounded-md p-1.5 text-sm outline-none focus:border-indigo-500"
                                >
                                  <option value="all-day">All Day</option>
                                  <option value="time-range">Time Range</option>
                                </select>
                                
                                {bd.type === 'time-range' && (
                                  <div className="flex items-center gap-1">
                                    <input 
                                      type="time" 
                                      value={bd.startTime || ''}
                                      onChange={(e) => updateBlockedDate(branchName, bd.id, 'startTime', e.target.value)}
                                      className="border border-gray-200 rounded-md p-1.5 text-sm outline-none focus:border-indigo-500" 
                                    />
                                    <span className="text-gray-400 text-xs">-</span>
                                    <input 
                                      type="time" 
                                      value={bd.endTime || ''}
                                      onChange={(e) => updateBlockedDate(branchName, bd.id, 'endTime', e.target.value)}
                                      className="border border-gray-200 rounded-md p-1.5 text-sm outline-none focus:border-indigo-500" 
                                    />
                                  </div>
                                )}
                                <button 
                                  onClick={() => removeBlockedDate(branchName, bd.id)}
                                  className="ml-auto text-red-400 hover:text-red-600 p-1"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
                {Object.values(branches).every(b => !b.active) && (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-sm text-gray-500">Select at least one branch above to configure scheduling.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* CARD 3: Pricing, Deposits & Rewards */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                Pricing & Rewards
              </h2>

              <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={overallLimitEnabled}
                    onChange={(e) => setOverallLimitEnabled(e.target.checked)}
                    className="w-4 h-4 accent-orange-600 rounded" 
                  />
                  <span className="text-sm font-bold text-orange-900">Overall Campaign Limit</span>
                </label>
                {overallLimitEnabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">Total Slots:</span>
                    <input 
                      type="number" 
                      value={overallLimit} 
                      onChange={(e) => setOverallLimit(parseInt(e.target.value) || 0)} 
                      className="w-20 border border-orange-200 rounded-lg p-1.5 text-sm outline-none text-center bg-white font-bold text-orange-900" 
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">BASE PRICE (RM)</label>
                  <input 
                    type="number" 
                    value={basePrice} 
                    onChange={(e) => setBasePrice(e.target.value)} 
                    placeholder="0.00" 
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">PROMO PRICE (RM)</label>
                  <input 
                    type="number" 
                    value={promoPrice} 
                    onChange={(e) => setPromoPrice(e.target.value)} 
                    placeholder="0.00" 
                    className="w-full border border-red-200 bg-red-50 text-red-700 font-bold rounded-lg p-2.5 text-sm outline-none focus:border-red-500" 
                  />
                </div>
              </div>

              <div className="mb-6 border-t border-gray-100 pt-5">
                <label className="block text-xs font-bold text-gray-500 mb-3">ANTI NO-SHOW ENGINE</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={requireDeposit}
                      onChange={(e) => setRequireDeposit(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600 rounded" 
                    />
                    <span className="text-sm font-medium text-gray-700">Require Upfront Deposit</span>
                  </label>
                  {requireDeposit && (
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs font-bold text-gray-500">RM</span>
                      <input 
                        type="number" 
                        value={depositAmount} 
                        onChange={(e) => setDepositAmount(e.target.value)} 
                        placeholder="50.00" 
                        className="w-24 border border-gray-200 rounded-lg p-1.5 text-sm outline-none focus:border-indigo-500" 
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6 border-t border-gray-100 pt-5">
                <label className="block text-xs font-bold text-gray-500 mb-3">GAMIFICATION & STAFF REWARDS</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Staff Incentive (RM)</label>
                    <input 
                      type="number" 
                      value={staffIncentive} 
                      onChange={(e) => setStaffIncentive(e.target.value)} 
                      placeholder="15.00" 
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Aracoins Perk</label>
                    <input 
                      type="number" 
                      value={aracoinsPerk} 
                      onChange={(e) => setAracoinsPerk(e.target.value)} 
                      placeholder="100" 
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-indigo-500" 
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <label className="block text-xs font-bold text-gray-500 mb-3">TIER ALLOWANCES (RM)</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-amber-700 mb-1 uppercase">Bronze</label>
                    <input 
                      type="number" 
                      value={tierBronze} 
                      onChange={(e) => setTierBronze(e.target.value)} 
                      placeholder="0.00" 
                      className="w-full border border-amber-200 bg-amber-50 rounded-lg p-2 text-sm outline-none focus:border-amber-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Silver</label>
                    <input 
                      type="number" 
                      value={tierSilver} 
                      onChange={(e) => setTierSilver(e.target.value)} 
                      placeholder="0.00" 
                      className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2 text-sm outline-none focus:border-slate-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-yellow-600 mb-1 uppercase">Gold</label>
                    <input 
                      type="number" 
                      value={tierGold} 
                      onChange={(e) => setTierGold(e.target.value)} 
                      placeholder="0.00" 
                      className="w-full border border-yellow-200 bg-yellow-50 rounded-lg p-2 text-sm outline-none focus:border-yellow-500" 
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* CARD 4: App Display & Media */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                <span className="bg-indigo-100 text-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
                App Display & Media
              </h2>

              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 mb-2">MARKETING POSTER</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer transition overflow-hidden relative ${
                    posterUrl ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                  }`}
                >
                  {posterUrl ? (
                    <>
                      <img src={posterUrl} alt="Poster preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                        <span className="text-white font-semibold flex items-center gap-2"><Upload size={18} /> Change Image</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="mx-auto text-gray-400 mb-2" size={32} />
                      <span className="block text-sm font-bold text-gray-600 tracking-wide">
                        {isUploading ? 'UPLOADING...' : 'UPLOAD PROMO GRAPHIC'}
                      </span>
                      <span className="block text-xs mt-1 text-gray-400">Click to browse (JPG, PNG)</span>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*"
                  className="hidden" 
                />
              </div>

              <div className="border-t border-gray-100 pt-5">
                <label className="block text-xs font-bold text-gray-500 mb-3">MOBILE APP DISPLAY</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition">
                    <input 
                      type="checkbox" 
                      checked={topFeatured}
                      onChange={(e) => setTopFeatured(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600 rounded" 
                    />
                    <div>
                      <span className="block text-sm font-bold text-gray-800">Top Featured Carousel</span>
                      <span className="block text-xs text-gray-500">Appears on mobile user dashboard and promotion page</span>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition">
                    <input 
                      type="checkbox" 
                      checked={categoryCarousel}
                      onChange={(e) => setCategoryCarousel(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600 rounded" 
                    />
                    <div>
                      <span className="block text-sm font-bold text-gray-800">Category Carousel</span>
                      <span className="block text-xs text-gray-500">Appears on mobile user promotion page only</span>
                    </div>
                  </label>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end gap-4">
          {onCancel && (
            <button 
              onClick={onCancel}
              disabled={isSubmitting}
              className="bg-zinc-100 text-zinc-600 px-8 py-4 rounded-xl shadow-sm hover:bg-zinc-200 transition font-bold flex items-center justify-center gap-2 disabled:opacity-70 text-lg"
            >
              CANCEL
            </button>
          )}
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-indigo-600 text-white px-8 py-4 rounded-xl shadow-md hover:bg-indigo-700 transition font-bold flex items-center justify-center gap-2 disabled:opacity-70 text-lg"
          >
            {isSubmitting ? 'SAVING...' : (initialData?.id ? 'UPDATE' : 'SAVE & PUBLISH')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddServiceForm;
