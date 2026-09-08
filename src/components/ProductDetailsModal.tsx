import React, { useEffect, useState } from 'react';
import { X, Heart, ShoppingBag, MessageCircle, ShieldCheck, Truck, Check } from 'lucide-react';
import { Product, CustomizationDetails, Review, getWesternSizeGuide, getWesternSizeOptions } from '../types';
import { formatCurrency, generateWhatsAppLink, getProductWhatsAppText, STORE_WHATSAPP_NUMBER } from '../utils/formatters';

interface ProductDetailsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  currency: 'INR' | 'USD';
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
  onAddToCart: (
    product: Product,
    selectedSize: string,
    isCustomized: boolean,
    customization?: CustomizationDetails,
    customizationFee?: number,
    selectedColor?: string
  ) => void;
  onAddReview: (productId: string, review: Omit<Review, 'id' | 'date' | 'verified'>) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  isOpen,
  onClose,
  currency,
  isWishlisted,
  onToggleWishlist,
  onAddToCart,
  onAddReview,
}) => {
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [selectedColorVariantId, setSelectedColorVariantId] = useState<string | undefined>();
  const [selectedSize, setSelectedSize] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  const [addedNotice, setAddedNotice] = useState(false);
  const [pincode, setPincode] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewLocation, setNewReviewLocation] = useState('');

  useEffect(() => {
    if (!product) return;
    const defaultSize = (product.sizeChart && product.sizeChart.length > 0
      ? product.sizeChart.find((entry) => entry.available && entry.stock > 0)?.size
      : product.availableSizes.find((size) => size)) || product.availableSizes[0] || '';
    setSelectedImgIndex(0);
    setSelectedColorVariantId(product.colorVariants?.[0]?.id);
    setSelectedSize(defaultSize);
    setActiveTab('details');
    setDeliveryStatus(null);
  }, [product]);

  if (!isOpen || !product) return null;

  const selectedColorVariant = product.colorVariants?.find((variant) => variant.id === selectedColorVariantId);
  const displayImages = selectedColorVariant?.images.length ? selectedColorVariant.images : product.images;

  const sizeOptions = (product.sizeChart && product.sizeChart.length > 0
    ? product.sizeChart
    : product.availableSizes.length > 0
      ? product.availableSizes.map((size) => ({ size, available: true, stock: product.stockCount }))
      : getWesternSizeOptions(product.name, product.subcategory).map((size) => ({ size, available: true, stock: 5 }))
  );
  const sizeGuide = getWesternSizeGuide(product.name, product.subcategory, product.sizeChart?.map((entry) => entry.size) ?? product.availableSizes);

  const handlePincodeCheck = (event: React.FormEvent) => {
    event.preventDefault();
    setDeliveryStatus(pincode.length === 6
      ? `Delivery available to ${pincode}. Shipping charge: ${formatCurrency(100, currency)}.`
      : 'Please enter a valid 6-digit pincode.');
  };

  const handleAddToCart = () => {
    onAddToCart(product, selectedSize, false, undefined, 0, selectedColorVariant?.name || product.color);
    setAddedNotice(true);
    setTimeout(() => {
      setAddedNotice(false);
      onClose();
    }, 1200);
  };

  const handleWhatsAppConsultation = () => {
    const message = getProductWhatsAppText(product.name, product.sku, product.price);
    window.open(generateWhatsAppLink(STORE_WHATSAPP_NUMBER, message), '_blank');
  };

  const submitReview = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) return;
    onAddReview(product.id, {
      author: newReviewAuthor.trim(),
      rating: newReviewRating,
      comment: newReviewComment.trim(),
      location: newReviewLocation.trim() || 'Verified Client',
    });
    setNewReviewAuthor('');
    setNewReviewComment('');
    setNewReviewLocation('');
    setShowReviewForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-200">
      <div className="relative bg-[#F5F2ED] w-full max-w-5xl border border-[#DCD7D0] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={(event) => event.stopPropagation()}>
        <div className="px-6 py-3.5 bg-[#EAE5DF] border-b border-[#DCD7D0] flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#2A2A2A] font-bold">{product.category} / {product.subcategory}</span>
            <span className="text-xs text-[#8C857D]">•</span>
            <span className="text-[10px] font-mono text-[#6B655E]">Product ID: {product.sku}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onToggleWishlist(product)} className={`p-1.5 border cursor-pointer ${isWishlisted ? 'bg-[#2A2A2A] text-white border-[#2A2A2A]' : 'bg-[#F5F2ED] text-[#2A2A2A] border-[#DCD7D0]'}`} title={isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}>
              <Heart size={15} fill={isWishlisted ? 'currentColor' : 'none'} />
            </button>
            <button onClick={onClose} className="p-1.5 text-[#2A2A2A] hover:opacity-60 cursor-pointer" title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-4">
              <div className="relative aspect-3/4 overflow-hidden bg-[#F0EDE9] border border-[#DCD7D0]">
                <img src={displayImages[selectedImgIndex] || displayImages[0]} alt={product.name} className="w-full h-full object-cover object-top" />
              </div>
              {displayImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {displayImages.map((image, index) => (
                    <button key={`${image}-${index}`} onClick={() => setSelectedImgIndex(index)} className={`relative w-16 h-20 overflow-hidden border shrink-0 cursor-pointer ${selectedImgIndex === index ? 'border-[#2A2A2A]' : 'border-[#DCD7D0] opacity-60'}`} title={`View product image ${index + 1}`}>
                      <img src={image} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="bg-[#EAE5DF] p-4 border border-[#DCD7D0] space-y-1.5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#2A2A2A]"><ShieldCheck size={14} className="text-[#A68A64]" /><span>BhuviSri Enterprises Authenticity</span></div>
                <p className="text-xs text-[#6B655E] font-light leading-relaxed">Silk Mark certified and hand-inspected for quality. Shipped in signature archival linen box.</p>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-6">
              <div>
                <h1 className="font-serif italic text-3xl text-[#2A2A2A] leading-tight">{product.name}</h1>
                <p className="text-xs text-[#6B655E] font-light mt-1">{product.tagline}</p>
                <div className="flex items-center gap-3 mt-3 text-xs">
                  <div className="bg-[#2A2A2A] text-white px-2 py-0.5 text-[10px] font-mono font-bold">★ {product.rating.toFixed(1)}</div>
                  <button onClick={() => setActiveTab('reviews')} className="text-[#6B655E] underline cursor-pointer">{product.reviews.length || product.reviewCount} reviews</button>
                  <span className="text-[#A68A64] uppercase tracking-wider text-[10px] font-bold">{product.inStock ? `In Stock (${product.stockCount} left)` : 'Out of Stock'}</span>
                </div>
              </div>

              <div className="p-4 bg-[#EAE5DF] border border-[#DCD7D0]">
                <div className="flex items-baseline gap-2.5"><span className="text-2xl font-bold text-[#2A2A2A]">{formatCurrency(product.price, currency)}</span>{product.originalPrice && <span className="text-xs text-[#6B655E] line-through">{formatCurrency(product.originalPrice, currency)}</span>}</div>
                <p className="text-[10px] uppercase tracking-wider text-[#6B655E] mt-1">Inclusive of all taxes. Shipping charge: {formatCurrency(100, currency)}</p>
              </div>

              <div className="flex border-b border-[#DCD7D0] space-x-6 text-xs uppercase tracking-[0.2em] font-medium">
                <button onClick={() => setActiveTab('details')} className={`pb-2.5 border-b-2 cursor-pointer ${activeTab === 'details' ? 'border-[#2A2A2A] text-[#2A2A2A] font-bold' : 'border-transparent text-[#6B655E]'}`}>Specifications</button>
                <button onClick={() => setActiveTab('reviews')} className={`pb-2.5 border-b-2 cursor-pointer ${activeTab === 'reviews' ? 'border-[#2A2A2A] text-[#2A2A2A] font-bold' : 'border-transparent text-[#6B655E]'}`}>Reviews ({product.reviews.length || product.reviewCount})</button>
              </div>

              {activeTab === 'details' && (
                <div className="space-y-4 text-xs">
                  {sizeOptions.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#2A2A2A]">Select Size</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {sizeOptions.map((entry) => {
                          const sizeLabel = entry.size;
                          const isAvailable = entry.available && (entry.stock > 0 || product.inStock);
                          return (
                            <button
                              key={sizeLabel}
                              type="button"
                              onClick={() => setSelectedSize(sizeLabel)}
                              disabled={!isAvailable}
                              className={`px-3 py-2 text-left border transition-all ${selectedSize === sizeLabel ? 'bg-[#2A2A2A] text-white border-[#2A2A2A] font-bold' : 'border-[#DCD7D0] text-[#2A2A2A]'} ${!isAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span>{sizeLabel}</span>
                                <span className="text-[9px] uppercase tracking-wider">{isAvailable ? 'Available' : 'Sold out'}</span>
                              </div>
                              <div className="mt-1 text-[9px] uppercase tracking-wider opacity-80">
                                {isAvailable ? `${entry.stock || 1} left` : 'Not available'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {sizeGuide.length > 0 && (
                    <div className="border border-[#DCD7D0] bg-[#EAE5DF] p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#2A2A2A]">Size Guide</span>
                        <span className="text-[9px] uppercase tracking-wider text-[#6B655E]">Fit guide</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[10px] text-[#2A2A2A]">
                          <thead>
                            <tr className="border-b border-[#DCD7D0]">
                              <th className="pb-2 pr-2 font-bold uppercase tracking-wider">Size</th>
                              <th className="pb-2 pr-2 font-bold uppercase tracking-wider">{/(pant|pants|trouser|jeans|chino|jogger)/.test(product.name.toLowerCase() + ' ' + product.subcategory.toLowerCase()) ? 'Waist' : 'Chest'}</th>
                              <th className="pb-2 pr-2 font-bold uppercase tracking-wider">Length</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sizeGuide.map((entry) => (
                              <tr key={entry.size} className="border-b border-[#DCD7D0] last:border-b-0">
                                <td className="py-2 pr-2 font-bold">{entry.size}</td>
                                <td className="py-2 pr-2">{/(pant|pants|trouser|jeans|chino|jogger)/.test(product.name.toLowerCase() + ' ' + product.subcategory.toLowerCase()) ? entry.waist : entry.chest}</td>
                                <td className="py-2 pr-2">{entry.length}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {product.colorVariants && product.colorVariants.length > 1 && <div><span className="text-[10px] uppercase tracking-wider text-[#6B655E] block mb-2">Available Colours ({product.colorVariants.length})</span><div className="flex flex-wrap gap-3">{product.colorVariants.map((variant) => <button key={variant.id} type="button" onClick={() => { setSelectedColorVariantId(variant.id); setSelectedImgIndex(0); }} className="flex flex-col items-center gap-1 cursor-pointer"><span className={`w-14 h-16 border overflow-hidden block transition-all ${selectedColorVariantId === variant.id ? 'border-[#2A2A2A] ring-2 ring-offset-1 ring-[#2A2A2A]' : 'border-[#DCD7D0]'}`}>{variant.images[0] ? <img src={variant.images[0]} alt={variant.name} className="w-full h-full object-cover" /> : <span className="block w-full h-full bg-[#DCD7D0]" />}</span><span className={`text-[9px] max-w-14 truncate ${selectedColorVariantId === variant.id ? 'text-[#2A2A2A] font-bold' : 'text-[#6B655E]'}`}>{variant.name}</span></button>)}</div></div>}
                  <div className="grid grid-cols-2 gap-2 pt-2">{[['Fabric', product.fabric], ['Color', selectedColorVariant?.name || product.color], ['Occasion', product.occasion]].map(([label, value]) => <div key={label} className="p-3 bg-[#EAE5DF] border border-[#DCD7D0]"><span className="text-[10px] uppercase tracking-wider text-[#6B655E] block">{label}</span><strong className="text-[#2A2A2A] font-medium">{value}</strong></div>)}</div>
                  <p className="text-xs text-[#6B655E] leading-relaxed font-light">{product.description}</p>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-3"><div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-[0.2em] font-bold">Verified Testimonials</span><button onClick={() => setShowReviewForm(!showReviewForm)} className="text-[10px] uppercase tracking-wider px-3 py-1 bg-[#2A2A2A] text-white cursor-pointer">{showReviewForm ? 'Cancel' : 'Write Review'}</button></div>{showReviewForm && <form onSubmit={submitReview} className="bg-[#EAE5DF] p-3 border border-[#DCD7D0] space-y-2"><div className="grid grid-cols-2 gap-2"><input required placeholder="Your Name" value={newReviewAuthor} onChange={(event) => setNewReviewAuthor(event.target.value)} className="bg-[#F5F2ED] border border-[#DCD7D0] p-1.5 text-xs" /><input placeholder="City" value={newReviewLocation} onChange={(event) => setNewReviewLocation(event.target.value)} className="bg-[#F5F2ED] border border-[#DCD7D0] p-1.5 text-xs" /></div><textarea required rows={2} placeholder="Your review comments..." value={newReviewComment} onChange={(event) => setNewReviewComment(event.target.value)} className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-1.5 text-xs" /><button type="submit" className="px-4 py-1 bg-[#2A2A2A] text-white text-[10px] uppercase tracking-wider cursor-pointer">Post Review</button></form>}<div className="space-y-2 max-h-48 overflow-y-auto">{product.reviews.map((review) => <div key={review.id} className="p-3 bg-[#EAE5DF] border border-[#DCD7D0] space-y-1"><div className="flex items-center justify-between text-xs"><span className="font-bold">{review.author}</span><span className="font-mono">★ {review.rating}</span></div><p className="text-xs text-[#6B655E]">{review.comment}</p></div>)}</div></div>
              )}

              <div className="pt-2 border-t border-[#DCD7D0]"><form onSubmit={handlePincodeCheck} className="flex gap-2"><div className="relative flex-1"><Truck size={14} className="absolute left-3 top-2.5 text-[#6B655E]" /><input type="text" maxLength={6} placeholder="Enter Delivery Pincode" value={pincode} onChange={(event) => setPincode(event.target.value.replace(/\D/g, ''))} className="w-full bg-[#EAE5DF] border border-[#DCD7D0] pl-8 pr-3 py-1.5 text-xs" /></div><button type="submit" className="px-4 py-1.5 bg-[#2A2A2A] text-white text-[10px] uppercase tracking-[0.2em]">Check</button></form>{deliveryStatus && <p className="text-[10px] text-[#2A2A2A] mt-1 font-medium">{deliveryStatus}</p>}</div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3"><button onClick={handleAddToCart} disabled={!product.inStock} className="flex-1 py-3.5 px-6 text-[11px] font-bold uppercase tracking-[0.2em] bg-[#2A2A2A] text-white disabled:opacity-50 cursor-pointer">{addedNotice ? <><Check size={14} className="inline mr-2" />Added to Shopping Bag</> : <><ShoppingBag size={14} className="inline mr-2" />Add to Bag • {formatCurrency(product.price + 100, currency)} incl. shipping</>}</button><button onClick={handleWhatsAppConsultation} className="py-3.5 px-5 bg-[#25D366] text-white text-[11px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 cursor-pointer"><MessageCircle size={15} /><span>WhatsApp Enquiry</span></button></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
