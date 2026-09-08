import React, { useState } from 'react';
import { Heart, Eye, ShoppingBag, MessageCircle, Check } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency, generateWhatsAppLink, getProductWhatsAppText, STORE_WHATSAPP_NUMBER } from '../utils/formatters';

interface ProductCardProps {
  product: Product;
  currency: 'INR' | 'USD';
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
  onQuickView: (product: Product) => void;
  onAddToCart: (product: Product, selectedColor?: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  currency,
  isWishlisted,
  onToggleWishlist,
  onQuickView,
  onAddToCart,
}) => {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const colorVariants = product.colorVariants && product.colorVariants.length > 0
    ? product.colorVariants
    : [{ id: product.id, name: product.color, images: product.images }];
  const [activeVariantId, setActiveVariantId] = useState(colorVariants[0].id);
  const activeVariant = colorVariants.find(v => v.id === activeVariantId) ?? colorVariants[0];
  const displayImages = activeVariant.images.length > 0 ? activeVariant.images : product.images;

  const handleSwatchSelect = (e: React.MouseEvent, variantId: string) => {
    e.stopPropagation();
    setActiveVariantId(variantId);
    setCurrentImgIndex(0);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product, activeVariant.name);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleWhatsAppInquiry = (e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = getProductWhatsAppText(product.name, product.sku, product.price);
    const link = generateWhatsAppLink(STORE_WHATSAPP_NUMBER, msg);
    window.open(link, '_blank');
  };

  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div
      id={`product-card-${product.id}`}
      className="group relative bg-[#F5F2ED] border border-[#DCD7D0] overflow-hidden flex flex-col hover:bg-white hover:border-[#2A2A2A] transition-all duration-300"
      onMouseEnter={() => {
        setIsHovered(true);
        if (displayImages.length > 1) setCurrentImgIndex(1);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setCurrentImgIndex(0);
      }}
    >
      {/* Product Image Stage */}
      <div 
        className="relative aspect-3/4 w-full overflow-hidden bg-[#F0EDE9] border-b border-[#DCD7D0] cursor-pointer"
        onClick={() => onQuickView(product)}
      >
        <img
          src={displayImages[currentImgIndex] || displayImages[0]}
          alt={product.name}
          className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 text-[9px] uppercase tracking-[0.2em] font-bold">
          {product.isBestSeller && (
            <span className="px-2 py-0.5 bg-[#2A2A2A] text-white">
              Bestseller
            </span>
          )}
          {product.isNewArrival && (
            <span className="px-2 py-0.5 bg-[#EAE5DF] text-[#2A2A2A] border border-[#DCD7D0]">
              New Arrival
            </span>
          )}
        </div>

        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#2A2A2A] text-white">
              -{discountPercent}%
            </span>
          </div>
        )}

        {/* Action Buttons Float (Wishlist & WhatsApp) */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-10 opacity-90 group-hover:opacity-100 transition-opacity">
          {/* Wishlist Button */}
          <button
            id={`wishlist-toggle-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(product);
            }}
            className={`w-8 h-8 flex items-center justify-center border transition-all cursor-pointer ${
              isWishlisted
                ? 'bg-[#2A2A2A] text-white border-[#2A2A2A]'
                : 'bg-white/90 text-[#2A2A2A] border-[#DCD7D0] hover:bg-[#2A2A2A] hover:text-white'
            }`}
            title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          >
            <Heart size={14} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>

          {/* Quick WhatsApp Inquiry */}
          <button
            id={`whatsapp-inquire-${product.id}`}
            onClick={handleWhatsAppInquiry}
            className="w-8 h-8 bg-white/90 hover:bg-[#25D366] text-[#2A2A2A] hover:text-white border border-[#DCD7D0] flex items-center justify-center transition-all cursor-pointer"
            title="Inquire on WhatsApp"
          >
            <MessageCircle size={14} />
          </button>
        </div>

        {/* Quick View Button Overlay */}
        <div className={`absolute inset-x-3 bottom-3 z-10 transition-all duration-300 pr-11 ${
          isHovered ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0 pointer-events-none'
        }`}>
          <button
            id={`quick-view-btn-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="w-full py-2 px-3 bg-white hover:bg-[#2A2A2A] hover:text-white text-[#2A2A2A] text-[10px] font-bold uppercase tracking-[0.2em] border border-[#DCD7D0] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Eye size={12} />
            <span>Quick View</span>
          </button>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Subcategory & Fabric Tag */}
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#6B655E]">
            <span>{product.subcategory}</span>
            <span className="truncate max-w-27.5 font-light">{product.fabric.split(' ')[0]}</span>
          </div>

          {/* Product Name */}
          <h2
            onClick={() => onQuickView(product)}
            className="font-serif italic text-lg text-[#2A2A2A] leading-snug hover:text-[#A68A64] transition-colors cursor-pointer line-clamp-1 mt-1"
            title={product.name}
          >
            {product.name}
          </h2>

          <p className="text-xs text-[#6B655E] line-clamp-1 font-light mt-0.5">
            {product.tagline}
          </p>

          <p className="text-[9px] uppercase tracking-wider text-[#8C857D] font-mono mt-1">
            Product ID: {product.sku}
          </p>

          {/* Colour Variant Thumbnails — Myntra-style "also available in" strip */}
{Array.isArray(colorVariants) && colorVariants.length > 1 && (
  <div className="mt-2">
    <div className="flex items-center gap-1.5">
      {colorVariants.slice(0, 4).map((variant) => {
        const thumb =
          Array.isArray(variant.images) && variant.images.length > 0
            ? variant.images[0]
            : Array.isArray(product?.images) && product.images.length > 0
              ? product.images[0]
              : null;

        const isActive = activeVariantId === variant.id;

        return (
          <button
            key={variant.id}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSwatchSelect(e, variant.id);
            }}
            title={variant.name || "Colour variant"}
            aria-label={`Select ${variant.name || "colour variant"}`}
            aria-pressed={isActive}
            className={`w-7 h-7 shrink-0 overflow-hidden border cursor-pointer transition-all ${
              isActive
                ? "ring-2 ring-offset-1 ring-[#2A2A2A] border-[#2A2A2A]"
                : "border-[#DCD7D0]"
            }`}
          >
            {thumb ? (
              <img
                src={thumb}
                alt={variant.name || "Colour variant"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                className="block w-full h-full"
                style={{
                  backgroundColor: "#DCD7D0",
                }}
              />
            )}
          </button>
        );
      })}

      {colorVariants.length > 4 && (
        <span className="text-[9px] text-[#6B655E] font-bold">
          +{colorVariants.length - 4}
        </span>
      )}
    </div>

    <p className="text-[9px] uppercase tracking-wider text-[#6B655E] mt-1">
      {colorVariants.length} Colours Available
    </p>
  </div>
)}

{/* Pricing and Action Footer */}
<div className="pt-3 border-t border-[#DCD7D0] flex items-center justify-between gap-2">
  <div>
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm font-bold text-[#2A2A2A]">
        {formatCurrency(product?.price ?? 0, currency)}
      </span>

      {product?.originalPrice != null && (
        <span className="text-[11px] text-[#6B655E] line-through">
          {formatCurrency(product.originalPrice, currency)}
        </span>
      )}
    </div>

    <p className="text-[10px] text-[#A68A64] font-medium uppercase tracking-wider">
      Ready to Dispatch
    </p>
  </div>
</div>

          {/* Add to Bag Button */}
          <button
            id={`add-to-cart-btn-${product.id}`}
            onClick={handleAddToCart}
            className={`px-3 py-2 text-[10px] uppercase tracking-[0.15em] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
              justAdded
                ? 'bg-[#2A2A2A] text-white border-[#2A2A2A]'
                : 'bg-[#EAE5DF] hover:bg-[#2A2A2A] text-[#2A2A2A] hover:text-white border-[#DCD7D0]'
            }`}
            title={`Add ${activeVariant.name} to Bag`}
          >
            {justAdded ? (
              <>
                <Check size={12} />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag size={12} />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
