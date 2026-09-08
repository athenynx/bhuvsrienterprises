import React, { useState } from 'react';
import { MessageCircle, ShieldCheck, Truck, ArrowRight, Check } from 'lucide-react';
import { generateWhatsAppLink, STORE_WHATSAPP_NUMBER } from '../utils/formatters';

interface FooterProps {
  onOpenAdmin: () => void;
  onOpenTracking?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenAdmin,
  onOpenTracking,
}) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterSubscribed(true);
    setNewsletterEmail('');
  };

  const handleDirectWhatsApp = () => {
    const link = generateWhatsAppLink(STORE_WHATSAPP_NUMBER, 'Namaste BhuviSri Enterprises! ✨ I would like styling assistance.');
    window.open(link, '_blank');
  };

  return (
    <footer id="main-footer" className="bg-[#2A2A2A] text-[#F5F2ED] pt-14 pb-10 border-t border-[#DCD7D0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
        
        {/* Top Newsletter & Brand Statement */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10 border-b border-[#3E3E3E] items-center">
          <div className="lg:col-span-6 space-y-2">
            <span className="font-serif italic text-2xl sm:text-3xl tracking-widest uppercase font-normal block">
              BhuviSri Enterprises
            </span>
            <p className="text-xs text-[#A89F91] max-w-md font-light leading-relaxed">
              Curated heritage handloom sarees, festive couture, and modern silhouettes crafted with care.
            </p>
          </div>

          <div className="lg:col-span-6">
            <div className="bg-[#333333] p-5 border border-[#444] space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#A68A64] block">
                The Atelier Circle
              </span>
              <p className="text-[11px] text-[#A89F91]">
                Join our private salon for private previews of limited edition handloom drops.
              </p>

              {newsletterSubscribed ? (
                <div className="p-2 bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] text-xs flex items-center gap-2">
                  <Check size={14} />
                  <span>Welcome to the circle. Private preview notes dispatched.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address..."
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="flex-1 bg-[#222] border border-[#555] px-3 py-2 text-xs text-white placeholder-[#777] focus:outline-none focus:border-[#A68A64]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#F5F2ED] hover:bg-white text-[#2A2A2A] text-[10px] font-bold uppercase tracking-[0.2em] transition-colors cursor-pointer"
                  >
                    Join
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-xs text-[#A89F91]">
          {/* Col 1: Collections */}
          <div className="space-y-3">
            <h3 className="text-white text-[11px] uppercase tracking-[0.2em] font-bold">
              Collections
            </h3>
            <ul className="space-y-2 text-[11px]">
              <li><span className="hover:text-white transition-colors cursor-pointer">Heritage Silk Sarees</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Hand-Painted Organza</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Raw Silk Anarkalis</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Pure Linen Outerwear</span></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Handcrafted Potlis</span></li>
            </ul>
          </div>

          {/* Col 2: Contact */}
          <div className="space-y-3">
            <h3 className="text-white text-[11px] uppercase tracking-[0.2em] font-bold">
              Contact
            </h3>
            <ul className="space-y-2 text-[11px]">
              <li>
                <a href="mailto:bhuvisri.enterprises@gmail.com" className="hover:text-white transition-colors">
                  bhuvisri.enterprises@gmail.com
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: WhatsApp Hotline */}
          <div className="space-y-3">
            <h3 className="text-white text-[11px] uppercase tracking-[0.2em] font-bold">
              Artisan Helpline
            </h3>
            <p className="text-[11px] text-[#A89F91]">
              Monday – Saturday, 9:00 AM – 8:00 PM IST
            </p>
            <button
              onClick={handleDirectWhatsApp}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#25D366] text-white text-[10px] font-bold uppercase tracking-[0.2em] transition-all cursor-pointer"
            >
              <MessageCircle size={14} />
              <span>WhatsApp Support</span>
            </button>
          </div>
        </div>

        {/* Geometric Balance Bottom Footer Bar */}
        <div className="pt-6 border-t border-[#3E3E3E] flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] uppercase tracking-[0.2em] text-[#8C857D]">
          <div className="flex flex-wrap gap-4">
            <span>Secure Payments: UPI, Visa, Amex</span>
            <span>•</span>
            <span>Complimentary Worldwide Shipping</span>
          </div>

          <div className="flex items-center gap-5">
            {onOpenTracking && (
              <button
                onClick={onOpenTracking}
                className="text-[#8C857D] hover:text-[#A68A64] cursor-pointer text-[10px] uppercase tracking-widest transition-colors"
              >
                Track Order
              </button>
            )}
            <button 
              id="footer-admin-login-btn"
              onClick={onOpenAdmin}
              className="text-[#8C857D] hover:text-[#A68A64] flex items-center gap-1.5 cursor-pointer text-[10px] uppercase tracking-widest transition-colors"
            >
              <span className="w-1.5 h-1.5 bg-[#8C857D] rounded-full"></span>
              <span>Staff Login</span>
            </button>
            <span className="border-l border-[#444] pl-4">
              BhuviSri Enterprises &copy; 2026
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
