import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  ShieldCheck, 
  MessageCircle,
  Tag
} from 'lucide-react';
import { CartItem } from '../types';
import { formatCurrency, generateWhatsAppLink, STORE_WHATSAPP_NUMBER } from '../utils/formatters';
interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  currency: 'INR' | 'USD';
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onProceedCheckout: () => void;
  couponCode: string;
  onApplyCoupon: (code: string) => { success: boolean; message: string };
  discount: number;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  currency,
  onUpdateQuantity,
  onRemoveItem,
  onProceedCheckout,
  couponCode,
  onApplyCoupon,
  discount,
}) => {
  if (!isOpen) return null;

  const [inputCoupon, setInputCoupon] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null);

  const subtotal = items.reduce((acc, item) => acc + item.itemTotal, 0);
  const shippingFee = items.length === 0 ? 0 : 100;
  const total = Math.max(0, subtotal - discount + shippingFee);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCoupon.trim()) return;
    const res = onApplyCoupon(inputCoupon.trim().toUpperCase());
    setCouponFeedback(res.message);
  };

  const handleWhatsAppCartOrder = () => {
    if (items.length === 0) return;
    const itemsList = items
      .map(
        (i, idx) =>
          `${idx + 1}. *${i.product.name}*\n${i.selectedColor ? `Colour: ${i.selectedColor}\n` : ''}${i.selectedSize ? `Size: ${i.selectedSize}\n` : ''}Quantity: ${i.quantity}\nItem total: ₹${i.itemTotal.toLocaleString('en-IN')}`
      )
      .join('\n');

    const msg = `Hello BhuviSri Enterprises Atelier! ✨\nI would like to place an order for the following items in my bag:\n\n${itemsList}\n\n*Subtotal:* ₹${subtotal.toLocaleString('en-IN')}\n*Estimated Total:* ₹${total.toLocaleString('en-IN')}\n\nPlease guide me through payment confirmation.`;
    const link = generateWhatsAppLink(STORE_WHATSAPP_NUMBER, msg);
    window.open(link, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        id="cart-slideover-drawer"
        className="w-full max-w-md bg-[#F5F2ED] h-full shadow-2xl flex flex-col justify-between border-l border-[#DCD7D0] animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#EAE5DF] border-b border-[#DCD7D0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-[#2A2A2A]" />
            <h1 className="font-serif italic text-xl text-[#2A2A2A]">
              Shopping Bag ({items.reduce((acc, i) => acc + i.quantity, 0)})
            </h1>
          </div>
          <button
            id="close-cart-btn"
            onClick={onClose}
            className="p-1 text-[#2A2A2A] hover:opacity-60 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Shipping Summary */}
        <div className="bg-[#F5F2ED] px-5 py-3 border-b border-[#DCD7D0]">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#2A2A2A]">
            <span>Shipping</span>
            <span className="font-mono font-bold text-[#A68A64]">{formatCurrency(shippingFee, currency)}</span>
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-14 h-14 bg-[#EAE5DF] border border-[#DCD7D0] text-[#6B655E] mx-auto flex items-center justify-center">
                <ShoppingBag size={24} />
              </div>
              <p className="text-xs uppercase tracking-widest text-[#6B655E]">Your shopping bag is empty.</p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-[#2A2A2A] text-white text-[11px] uppercase tracking-[0.2em] hover:bg-[#404040] transition-colors cursor-pointer"
              >
                Explore Collection
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-[#EAE5DF] p-3.5 border border-[#DCD7D0] flex gap-3.5 relative"
              >
                {/* Thumbnail */}
                <div className="w-16 h-20 overflow-hidden bg-[#F0EDE9] shrink-0 border border-[#DCD7D0]">
                  <img
                    src={item.product.images?.[0] || item.product.colorVariants?.[0]?.images?.[0] || 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80'}
                    alt={item.product.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between text-xs">
                  <div>
                    <div className="flex justify-between items-start pr-6">
                      <h2 className="font-serif italic text-sm text-[#2A2A2A] line-clamp-1">
                        {item.product.name}
                      </h2>
                    </div>

                    {item.selectedSize && <p className="text-[10px] uppercase tracking-wider text-[#6B655E] mt-0.5">
                      Size: <strong className="text-[#2A2A2A]">{item.selectedSize}</strong>
                    </p>}
                    {item.selectedColor && (
                      <p className="text-[10px] uppercase tracking-wider text-[#6B655E] mt-0.5">
                        Colour: <strong className="text-[#2A2A2A]">{item.selectedColor}</strong>
                      </p>
                    )}

                  </div>

                  {/* Quantity & Price Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#DCD7D0] mt-2">
                    <div className="flex items-center border border-[#DCD7D0] bg-[#F5F2ED]">
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="p-1 text-[#2A2A2A] hover:bg-[#DCD7D0] cursor-pointer"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="px-2 text-xs font-mono font-bold text-[#2A2A2A]">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="p-1 text-[#2A2A2A] hover:bg-[#DCD7D0] cursor-pointer"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    <span className="font-bold text-xs text-[#2A2A2A]">
                      {formatCurrency(item.itemTotal, currency)}
                    </span>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="absolute top-3 right-3 text-[#6B655E] hover:text-[#2A2A2A] cursor-pointer"
                  title="Remove Item"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer with Coupon, Totals & Checkout */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 bg-[#EAE5DF] border-t border-[#DCD7D0] space-y-3">
            {/* Coupon Code Input */}
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <div className="relative flex-1">
                <Tag size={12} className="absolute left-2.5 top-2.5 text-[#6B655E]" />
                <input
                  type="text"
                  placeholder="Coupon: BHUVI10 or BHUVI15"
                  value={inputCoupon}
                  onChange={(e) => setInputCoupon(e.target.value)}
                  className="w-full bg-[#F5F2ED] border border-[#DCD7D0] pl-7 pr-2 py-1.5 text-xs text-[#2A2A2A] uppercase focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#2A2A2A] text-white text-[10px] uppercase tracking-[0.2em] font-bold cursor-pointer hover:bg-[#404040]"
              >
                Apply
              </button>
            </form>

            {couponFeedback && (
              <p className="text-[10px] text-[#2A2A2A] font-medium">{couponFeedback}</p>
            )}

            {/* Calculations Breakdown */}
            <div className="space-y-1 text-xs text-[#2A2A2A]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-[#A68A64] font-bold">
                  <span>Coupon Discount ({couponCode})</span>
                  <span>-{formatCurrency(discount, currency)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{shippingFee === 0 ? 'COMPLIMENTARY' : formatCurrency(shippingFee, currency)}</span>
              </div>

              <div className="flex justify-between pt-2 border-t border-[#DCD7D0] font-bold text-sm text-[#2A2A2A]">
                <span>Total Amount</span>
                <span>{formatCurrency(total, currency)}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2 pt-1">
              <button
                id="checkout-proceed-btn"
                onClick={() => {
                  onClose();
                  onProceedCheckout();
                }}
                className="w-full py-3.5 bg-[#2A2A2A] hover:bg-[#404040] text-white text-[11px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <ShieldCheck size={15} />
                <span>Secure Checkout • {formatCurrency(total, currency)}</span>
                <ArrowRight size={13} />
              </button>

              <button
                onClick={handleWhatsAppCartOrder}
                className="w-full py-2.5 bg-[#25D366] text-white text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle size={14} />
                <span>Order via WhatsApp</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
