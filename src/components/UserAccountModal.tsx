import React, { useState } from 'react';
import { 
  User, 
  Package, 
  Heart, 
  LogOut, 
  X, 
  Check, 
  Eye,
  EyeOff,
  MessageCircle, 
  ShieldCheck
} from 'lucide-react';
import { UserProfile, Order, Product } from '../types';
import { formatCurrency, generateWhatsAppLink, getOrderWhatsAppText, STORE_WHATSAPP_NUMBER } from '../utils/formatters';
import { supabase } from '../lib/supabase';

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLogin: (user: UserProfile) => void;
  onLogout: () => void;
  orders: Order[];
  wishlist: Product[];
  currency: 'INR' | 'USD';
  onOpenProduct: (product: Product) => void;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout,
  orders,
  wishlist,
  currency,
  onOpenProduct,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist'>('orders');
  
  // Login / Register Form State
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleCustomAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const email = loginEmail.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailPattern.test(email)) {
      setAuthError('Enter a valid email address, for example name@example.com.');
      return;
    }
    if (isRegisterMode && !loginName.trim()) {
      setAuthError('Full name is required.');
      return;
    }
    if (isRegisterMode && !/^\+?[0-9\s-]{10,15}$/.test(loginPhone.trim())) {
      setAuthError('Enter a valid WhatsApp number.');
      return;
    }
    if (loginPassword.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }
    const result = isRegisterMode
      ? await supabase.auth.signUp({
        email,
        password: loginPassword,
        options: { data: { full_name: loginName, phone: loginPhone } },
      })
      : await supabase.auth.signInWithPassword({ email, password: loginPassword });

    if (result.error) {
      setAuthError(result.error.message);
      return;
    }

    if (isRegisterMode && !result.data.session) {
      setAuthError('Account created. Check your email and confirm it before signing in.');
      return;
    }

    if (result.data.user) {
      onLogin({
        id: result.data.user.id,
        name: loginName || result.data.user.email?.split('@')[0] || 'Valued Client',
        email: result.data.user.email || email,
        phone: loginPhone,
        role: 'customer',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div 
        id="user-account-modal"
        className="relative bg-[#F5F2ED] w-full max-w-3xl border border-[#DCD7D0] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#EAE5DF] border-b border-[#DCD7D0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#2A2A2A] text-white flex items-center justify-center font-serif italic text-base">
              {currentUser ? currentUser.name.charAt(0) : <User size={16} />}
            </div>
            <div>
              <h1 className="font-serif italic text-xl text-[#2A2A2A]">
                {currentUser ? `Namaste, ${currentUser.name}` : 'Login / Sign Up'}
              </h1>
              <p className="text-[10px] uppercase tracking-wider text-[#6B655E]">
                {currentUser ? currentUser.email : 'Sign in or create an account to access your orders'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                onClick={onLogout}
                className="p-1.5 text-[#6B655E] hover:text-[#2A2A2A] transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-[#2A2A2A] hover:opacity-60 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {!currentUser ? (
          /* Sign In / Sign Up Screen */
          <div className="p-6 sm:p-8 max-w-md mx-auto w-full space-y-6">
            <div className="text-center space-y-1">
              <h2 className="font-serif italic text-2xl text-[#2A2A2A]">
                {isRegisterMode ? 'Create Account' : 'Welcome Back'}
              </h2>
              <p className="text-xs text-[#6B655E] font-light">
                Manage your orders and account details.
              </p>
            </div>

            <form onSubmit={handleCustomAuth} className="space-y-3.5 text-xs">
              {isRegisterMode && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B655E] mb-1 font-bold">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2.5 text-xs text-[#2A2A2A]"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#6B655E] mb-1 font-bold">Email Address *</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2.5 text-xs text-[#2A2A2A]"
                />
              </div>

              <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B655E] mb-1 font-bold">WhatsApp Number *</label>
                <input
                  type="tel"
                    required={isRegisterMode}
                    value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2.5 text-xs text-[#2A2A2A]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#6B655E] mb-1 font-bold">Password *</label>
                <div className="relative">
                  <input
                    type={isPasswordVisible ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2.5 pr-10 text-xs text-[#2A2A2A]"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#6B655E] hover:text-[#2A2A2A] cursor-pointer"
                    aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                    title={isPasswordVisible ? 'Hide password' : 'Show password'}
                  >
                    {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {authError && <p className="text-xs text-[#2A2A2A] font-bold">{authError}</p>}

              <button
                type="submit"
                className="w-full py-3 bg-[#2A2A2A] hover:bg-[#404040] text-white text-[10px] font-bold uppercase tracking-[0.2em] cursor-pointer"
              >
                {isRegisterMode ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div className="text-center">
              <button
                onClick={() => setIsRegisterMode(!isRegisterMode)}
                className="text-[10px] uppercase tracking-wider text-[#A68A64] hover:underline font-bold cursor-pointer"
              >
                {isRegisterMode ? 'Already have an account? Sign In' : 'New to BhuviSri Enterprises? Register here'}
              </button>
            </div>
          </div>
        ) : (
          /* User Dashboard */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="bg-[#EAE5DF] px-6 border-b border-[#DCD7D0] flex items-center space-x-6 text-[10px] font-bold uppercase tracking-[0.2em] overflow-x-auto">
              {[
                { id: 'orders', label: `My Orders (${orders.length})`, icon: Package },
                { id: 'wishlist', label: `Wishlist (${wishlist.length})`, icon: Heart },
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as 'orders' | 'wishlist')}
                    className={`py-3.5 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === t.id
                        ? 'border-[#2A2A2A] text-[#2A2A2A]'
                        : 'border-transparent text-[#6B655E] hover:text-[#2A2A2A]'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Panels */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              
              {/* TAB: MY ORDERS */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <div className="text-center py-12 text-xs uppercase tracking-widest text-[#6B655E]">
                      <Package size={28} className="mx-auto mb-2 opacity-40" />
                      <p>You haven't placed any orders yet.</p>
                    </div>
                  ) : (
                    orders.map((ord) => (
                      <div key={ord.id} className="bg-[#EAE5DF] p-4 sm:p-5 border border-[#DCD7D0] space-y-3.5">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-[#DCD7D0]">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-[#2A2A2A]">#{ord.orderNumber}</span>
                              <span className="text-xs text-[#6B655E]">• Placed on {ord.date}</span>
                            </div>
                            <span className="text-[10px] text-[#6B655E] font-mono">AWB: {ord.trackingNumber} ({ord.courierPartner})</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-[#2A2A2A] text-white text-[10px] uppercase font-bold tracking-wider">
                              {ord.orderStatus}
                            </span>
                            <button
                              onClick={() => {
                                const msg = getOrderWhatsAppText(ord.orderNumber, ord.customer.name, ord.orderStatus);
                                const link = generateWhatsAppLink(STORE_WHATSAPP_NUMBER, msg);
                                window.open(link, '_blank');
                              }}
                              className="p-1.5 bg-[#25D366] text-white cursor-pointer"
                              title="Ask on WhatsApp"
                            >
                              <MessageCircle size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-2">
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="flex gap-3 text-xs">
                              <img src={it.product.images[0]} alt="" className="w-12 h-14 object-cover border border-[#DCD7D0]" />
                              <div className="flex-1">
                                <h3 className="font-serif italic text-sm text-[#2A2A2A]">{it.product.name}</h3>
                                <p className="text-[#6B655E]">{it.selectedSize ? `Size: ${it.selectedSize} · ` : ''}Qty: {it.quantity}</p>
                              </div>
                              <span className="font-bold text-[#2A2A2A]">{formatCurrency(it.itemTotal, currency)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Interactive Timeline */}
                        <div className="pt-3 border-t border-[#DCD7D0]">
                          <p className="text-[10px] font-bold text-[#2A2A2A] uppercase tracking-[0.2em] mb-2">Live Production Timeline</p>
                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-[10px]">
                            {ord.timeline.map((step, sIdx) => (
                              <div
                                key={sIdx}
                                className={`p-2 border ${
                                  step.completed
                                    ? 'bg-[#2A2A2A] border-[#2A2A2A] text-white'
                                    : 'bg-[#F5F2ED] border-[#DCD7D0] text-[#6B655E]'
                                }`}
                              >
                                <div className="flex items-center gap-1 font-bold text-[9px] uppercase">
                                  {step.completed ? <Check size={10} /> : <span className="w-1 h-1 bg-[#6B655E]"></span>}
                                  <span>{step.status}</span>
                                </div>
                                <span className="block mt-0.5 text-[9px] opacity-75">{step.timestamp}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB: WISHLIST */}
              {activeTab === 'wishlist' && (
                <div className="space-y-4">
                  {wishlist.length === 0 ? (
                    <div className="text-center py-12 text-xs uppercase tracking-widest text-[#6B655E]">
                      <Heart size={28} className="mx-auto mb-2 opacity-40" />
                      <p>Your wishlist is currently empty.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {wishlist.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => {
                            onClose();
                            onOpenProduct(prod);
                          }}
                          className="p-3 bg-[#EAE5DF] border border-[#DCD7D0] flex gap-3 items-center hover:border-[#2A2A2A] transition-all cursor-pointer"
                        >
                          <img src={prod.images[0]} alt="" className="w-12 h-14 object-cover border border-[#DCD7D0]" />
                          <div className="flex-1 text-xs">
                            <h3 className="font-serif italic text-sm text-[#2A2A2A] line-clamp-1">{prod.name}</h3>
                            <span className="font-bold text-[#2A2A2A] block mt-0.5">{formatCurrency(prod.price, currency)}</span>
                            <span className="text-[10px] text-[#A68A64] uppercase font-bold tracking-wider">View Product →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
};
