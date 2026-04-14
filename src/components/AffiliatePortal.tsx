import React from 'react';
import { motion } from 'motion/react';
import { DashboardUI } from './DashboardUI';
import { ReferralBoard } from './ReferralBoard';
import { 
  PlusCircle, Trash2, UserCircle, RefreshCw, DollarSign, Palette, Sun, Moon, BookOpen, ChevronRight, Lock, MessageSquare,
  Zap, Star, Clock, Edit2, QrCode, Copy, MessageCircle, Share2, Users, CheckCircle2, ShieldCheck, ArrowLeft, Mail, Info
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'react-hot-toast';

import { ProfileUI } from './ProfileUI';
import { InboxUI } from './InboxUI';
import { GuideUI } from './GuideUI';
import { KitUI } from './KitUI';
import { PromotionsUI } from './PromotionsUI';

export interface AffiliatePortalProps {
  activeTab: string;
  currentUser: any;
  clinicProfile: any;
  referrals: any[];
  currentUserStats: any;
  progressToNext: number;
  nextTier: any;
  handleUpdateProfile?: (data: any) => void;
  adminStats?: any;
  receptionistStats?: any;
  activeStaffList?: any[];
  staffList?: any[];
  services?: any[];
  isMobile?: boolean;
  checkBranchAccess?: any;
  setActiveTab?: any;
  handleDeleteReferral?: any;
  handleUpdateStatus?: any;
  handleClinicStatusUpdate?: any;
  setSelectedPromo?: any;
  setIsPromoModalOpen?: any;
  getStatusColor?: any;
  getStatusLabel?: any;
  setSelectedStaffDetail?: any;
  setShowStaffModal?: any;
  branches?: any[];
  fetchReferrals?: any;
  darkMode?: boolean;
  isUploading?: boolean;
  handleImageUpload?: any;
  THEMES?: any;
  selectedTheme?: string;
  setSelectedTheme?: any;
  setDarkMode?: any;
  windowWidth?: number;
  reduceTranslucency?: boolean;
  setReduceTranslucency?: any;
  setShowPasswordModal?: any;
  feedbackMessage?: string;
  setFeedbackMessage?: any;
  submitFeedback?: any;
  isSubmittingFeedback?: boolean;
  promotions?: any[];
  notifications?: any[];
  markAllAsRead?: any;
  markNotificationAsRead?: any;
  patientName?: string;
  setPatientName?: any;
  patientPhone?: string;
  setPatientPhone?: any;
  patientIC?: string;
  setPatientIC?: any;
  patientType?: string;
  setPatientType?: any;
  patientAddress?: string;
  setPatientAddress?: any;
  selectedService?: string;
  setSelectedService?: any;
  selectedBranch?: string;
  setSelectedBranch?: any;
  appointmentDate?: string;
  setAppointmentDate?: any;
  bookingTime?: string;
  setBookingTime?: any;
  isSubmitting?: boolean;
  handleSubmitReferral?: any;
  urlServiceName?: string;
  getAvailableTimeSlots?: any;
  serviceCategories?: any[];
}

export const AffiliatePortal: React.FC<AffiliatePortalProps> = (props) => {
  const { activeTab } = props;

  if (activeTab === 'dashboard') {
    return <DashboardUI {...props as any} />;
  }

  if (activeTab === 'referrals') {
    return <ReferralBoard {...props as any} />;
  }

  if (activeTab === 'profile') {
    return <ProfileUI {...props as any} />;
  }

  if (activeTab === 'inbox') {
    return <InboxUI {...props as any} />;
  }

  if (activeTab === 'guide') {
    return <GuideUI {...props as any} />;
  }

  if (activeTab === 'kit') {
    return <KitUI {...props as any} />;
  }

  if (activeTab === 'promotions') {
    return <PromotionsUI {...props as any} />;
  }

  return null;
};
