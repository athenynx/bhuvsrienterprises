import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ShieldCheck, 
  Eye,
  EyeOff,
  Package, 
  Upload, 
  Truck, 
  Plus, 
  Trash2, 
  Edit3, 
  MessageCircle, 
  X, 
  Settings, 
  LogOut,
  Sparkles,
  Search,
  MapPin,
  Image as ImageIcon,
  ArrowLeft,
  ArrowRight,
  Star,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Product, ProductColorVariant, Order, OrderStatus, ProductCategory, SizeChart } from '../types';
import { formatCurrency, generateWhatsAppLink, getOrderWhatsAppText } from '../utils/formatters';
import { ShipmentManagement } from './ShipmentManagement';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  orders: Order[];
  onAddProduct: (product: Product) => Promise<boolean>;
  onUpdateProduct: (product: Product) => Promise<boolean>;
  onDeleteProduct: (productId: string) => void;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus, trackingNumber?: string, courierPartner?: string) => void;
  isAdminLoggedIn: boolean;
  onAdminLogin: (email: string, pass: string) => Promise<{ success: boolean; reason?: 'invalid_credentials' | 'not_authorized' | 'error' }>;
  onAdminLogout: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen,
  onClose,
  products,
  orders,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateOrderStatus,
  isAdminLoggedIn,
  onAdminLogin,
  onAdminLogout,
}) => {
  if (!isOpen) return null;

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'tracking' | 'settings'>('overview');
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);

  // Product Manager State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [showDeactivated, setShowDeactivated] = useState(false);

  // New Product Form State
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<ProductCategory>('sarees');
  const [subcategory, setSubcategory] = useState('');
  const [price, setPrice] = useState(0);
  const [originalPrice, setOriginalPrice] = useState(0);
  
  // Multi-Image Upload State
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageGallery, setImageGallery] = useState<string[]>([]);
  const [isDraggingImages, setIsDraggingImages] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialColorVariant: ProductColorVariant = {
    id: 'variant-new-1',
    name: '',
    images: [],
  };
  const [colorVariants, setColorVariants] = useState<ProductColorVariant[]>([initialColorVariant]);
  const [activeColorVariantId, setActiveColorVariantId] = useState<string | null>(initialColorVariant.id);

  const [fabric, setFabric] = useState('');
  const [color, setColor] = useState('');
  const [occasion, setOccasion] = useState('');
  const [description, setDescription] = useState('');
  const [craftDetails, setCraftDetails] = useState<string[]>([]);
  const [careInstructions, setCareInstructions] = useState('');
  const [availableSizes, setAvailableSizes] = useState('');
  const [sizeChart, setSizeChart] = useState<Array<{ size: string; available: boolean; stock: number }>>([]);
  const [customSizeChart, setCustomSizeChart] = useState<SizeChart | undefined>();
  const [stockCount, setStockCount] = useState(0);
  const [inStock, setInStock] = useState(true);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);

  const normalizeSizeInput = (sizeValue: string) => sizeValue
    .split(',')
    .map((size) => size.trim().toUpperCase())
    .filter(Boolean);

  const westernSizeOptions = ['S', 'M', 'L', 'XL', 'XXL'];

  const syncSizeChartFromText = (text: string) => {
    const normalizedSizes = normalizeSizeInput(text);
    if (normalizedSizes.length === 0) {
      setSizeChart([]);
      setAvailableSizes('');
      return;
    }

    setAvailableSizes(normalizedSizes.join(', '));
    setSizeChart((prev) => {
      const nextEntries = normalizedSizes.map((size) => {
        const existing = prev.find((entry) => entry.size === size);
        return {
          size,
          available: existing?.available ?? true,
          stock: existing?.stock ?? 5,
        };
      });
      return nextEntries;
    });
  };

  const toggleWesternSize = (size: string) => {
    const currentSizes = normalizeSizeInput(availableSizes);
    const nextSizes = currentSizes.includes(size)
      ? currentSizes.filter((currentSize) => currentSize !== size)
      : [...currentSizes, size];
    syncSizeChartFromText(nextSizes.join(', '));
  };

  const updateSizeChartEntry = (size: string, patch: Partial<{ available: boolean; stock: number }>) => {
    setSizeChart((prev) => {
      const next = [...prev];
      const index = next.findIndex((entry) => entry.size === size);
      if (index >= 0) {
        next[index] = { ...next[index], ...patch };
      } else {
        next.push({ size, available: patch.available ?? true, stock: patch.stock ?? 5 });
      }
      const sorted = next.sort((a, b) => westernSizeOptions.indexOf(a.size) - westernSizeOptions.indexOf(b.size));
      setAvailableSizes(sorted.map((entry) => entry.size).join(', '));
      return sorted;
    });
  };

  const saveActiveVariantImages = () => {
    if (!activeColorVariantId) return;
    setColorVariants(prev => prev.map(variant => (
      variant.id === activeColorVariantId
        ? { ...variant, name: color.trim() || variant.name, images: imageGallery }
        : variant
    )));
  };

  const ensureSizeChartForProduct = (textValue: string) => {
    const normalizedSizes = normalizeSizeInput(textValue);
    if (normalizedSizes.length === 0) {
      setSizeChart([]);
      return;
    }

    const nextSizeChart = normalizedSizes.map((size) => {
      const existing = sizeChart.find((entry) => entry.size === size);
      return {
        size,
        available: existing?.available ?? true,
        stock: existing?.stock ?? 5,
      };
    });
    setSizeChart(nextSizeChart);
    setAvailableSizes(normalizedSizes.join(', '));
  };

  const updateCustomChart = (patch: Partial<SizeChart>) => {
    setCustomSizeChart((current) => ({
      id: current?.id,
      name: current?.name ?? 'Size Chart',
      description: current?.description ?? '',
      unit: current?.unit ?? 'cm',
      measurementFields: current?.measurementFields ?? ['Chest', 'Waist', 'Length'],
      rows: current?.rows ?? [],
      ...patch,
    }));
  };

  const syncCustomChartSizes = (sizes: string[]) => {
    if (!customSizeChart) return;
    const rows = sizes.map((size) => customSizeChart.rows.find((row) => row.size === size) ?? { size, measurements: {} });
    updateCustomChart({ rows });
  };

  const selectColorVariant = (variant: ProductColorVariant) => {
    saveActiveVariantImages();
    setActiveColorVariantId(variant.id);
    setColor(variant.name);
    setImageGallery([...variant.images]);
  };

  const addColorVariant = () => {
    saveActiveVariantImages();
    const variant: ProductColorVariant = {
      id: `variant-${Date.now()}`,
      name: '',
      images: [],
    };
    setColorVariants(prev => [...prev, variant]);
    setActiveColorVariantId(variant.id);
    setColor(variant.name);
    setImageGallery([]);
  };

  const removeColorVariant = (variantId: string) => {
    const remaining = colorVariants.filter(variant => variant.id !== variantId);
    setColorVariants(remaining);
    if (activeColorVariantId === variantId) {
      const next = remaining[0];
      setActiveColorVariantId(next?.id ?? null);
      setColor(next?.name ?? '');
      setImageGallery(next ? [...next.images] : []);
    }
  };

  // Order Search & Filter
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');

  // Settings State
  const [whatsappHelpline, setWhatsappHelpline] = useState('+91 80088 89317');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await onAdminLogin(loginEmail.trim(), password);
    if (!result.success) {
      setLoginError(
        result.reason === 'not_authorized'
          ? 'Your account is not authorized as an administrator.'
          : result.reason === 'error'
          ? 'Could not verify admin access. Please try again.'
          : 'Incorrect email or password.'
      );
    } else {
      setLoginError(null);
    }
  };

  // Multiple File Processing using real Supabase Storage bucket.
  const processFiles = async (files: FileList | File[]) => {
    if (!activeColorVariantId) {
      setUploadStatusMsg('Select a colour variant before uploading photos.');
      setTimeout(() => setUploadStatusMsg(null), 3500);
      return;
    }
    if (!color.trim()) {
      setUploadStatusMsg('Enter the colour name before uploading photos so they stay linked to this variant.');
      setTimeout(() => setUploadStatusMsg(null), 3500);
      return;
    }
    const maxImageSize = 15 * 1024 * 1024;
    const validImageFiles = Array.from(files).filter(
      file => file.type.startsWith('image/') && file.size <= maxImageSize,
    );
    if (validImageFiles.length === 0) {
      setUploadStatusMsg('Please select image files no larger than 15 MB each.');
      setTimeout(() => setUploadStatusMsg(null), 3500);
      return;
    }

    const skippedCount = Array.from(files).length - validImageFiles.length;
    setUploadStatusMsg(
      `Uploading ${validImageFiles.length} photo(s) for ${color}${skippedCount ? `; skipped ${skippedCount}` : ''}...`,
    );

    try {
      const uploadedUrls = await Promise.all(validImageFiles.map(async (file) => {
        const safeName = `${Date.now()}-${Math.random().toString(16).slice(2)}-${file.name.replace(/\s+/g, '-').toLowerCase()}`;
        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(safeName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          });

        if (error) {
          throw error;
        }

        const publicUrl = supabase.storage.from('product-images').getPublicUrl(data.path).data.publicUrl;
        return publicUrl;
      }));

      setImageGallery(prev => [...prev, ...uploadedUrls.filter(url => !prev.includes(url))]);
      setUploadStatusMsg(`Successfully uploaded ${uploadedUrls.length} image(s).`);
      setTimeout(() => setUploadStatusMsg(null), 3500);
    } catch (error) {
      console.error('Image upload failed:', error);
      setUploadStatusMsg('Image upload failed. Check Supabase Storage permissions and bucket configuration.');
      setTimeout(() => setUploadStatusMsg(null), 4500);
    }
  };

  const handleImageFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
      e.target.value = ''; // Reset input to allow re-selecting same files
    }
  };

  // Drag and Drop Handlers for Multiple Images
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImages(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImages(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingImages(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Bulk URL Adder (handles single URL or comma/newline separated URLs)
  const handleAddImageUrls = () => {
    if (!imageUrlInput.trim()) return;
    if (!activeColorVariantId || !color.trim()) {
      setUploadStatusMsg('Select and name a colour variant before adding image URLs.');
      setTimeout(() => setUploadStatusMsg(null), 3500);
      return;
    }

    const urls = imageUrlInput
      .split(/[\n,]+/)
      .map(u => u.trim())
      .filter(u => u.length > 0 && (u.startsWith('http://') || u.startsWith('https://')));

    if (urls.length > 0) {
      setUploadStatusMsg('External URLs are accepted for preview, but product images should be uploaded to Supabase Storage for production use.');
      setImageGallery(prev => [...prev, ...urls]);
      setImageUrlInput('');
      setTimeout(() => setUploadStatusMsg(null), 4500);
    } else {
      setUploadStatusMsg('Please enter valid image URLs starting with http:// or https://');
      setTimeout(() => setUploadStatusMsg(null), 4000);
    }
  };

  // Image Reordering & Removal Controls
  const setCoverImage = (index: number) => {
    if (index === 0) return;
    setImageGallery(prev => {
      const copy = [...prev];
      const selected = copy.splice(index, 1)[0];
      return [selected, ...copy];
    });
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= imageGallery.length) return;
    setImageGallery(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const removeImage = (index: number) => {
    setImageGallery(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllImages = () => {
    if (window.confirm('Clear all uploaded images for this product?')) {
      setImageGallery([]);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const parsedPrice = Number(price);
    const parsedOriginalPrice = Number(originalPrice || 0);
    const parsedStockCount = Number(stockCount);
    const normalizedSizes = normalizeSizeInput(availableSizes);
    const chartToSave = sizeChart.length > 0 ? sizeChart : normalizedSizes.map((size) => ({ size, available: true, stock: parsedStockCount > 0 ? Math.max(1, Math.floor(parsedStockCount / Math.max(normalizedSizes.length, 1))) : 0 }));
    const sizeStockTotal = normalizedSizes.length > 0
      ? chartToSave.reduce((total, entry) => total + (entry.available ? Math.max(0, entry.stock) : 0), 0)
      : parsedStockCount;
    const mergedSizes = normalizedSizes;
    const variantDrafts = colorVariants.length
      ? colorVariants.map(variant => variant.id === activeColorVariantId ? { ...variant, name: color.trim(), images: imageGallery } : variant)
      : [{ id: `variant-${Date.now()}`, name: color.trim(), images: imageGallery }];
    const savedVariants = variantDrafts.filter((variant) => variant.name.trim());
    const allVariantImages = Array.from(new Set(savedVariants.flatMap(variant => variant.images)));

    if (!trimmedName) {
      setUploadStatusMsg('Please enter a product name.');
      setTimeout(() => setUploadStatusMsg(null), 3000);
      return;
    }

    if (!trimmedCategory) {
      setUploadStatusMsg('Please select a product category.');
      setTimeout(() => setUploadStatusMsg(null), 3000);
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setUploadStatusMsg('Price must be greater than zero.');
      setTimeout(() => setUploadStatusMsg(null), 3000);
      return;
    }

    if (parsedOriginalPrice > 0 && parsedOriginalPrice < parsedPrice) {
      setUploadStatusMsg('Original price should be greater than or equal to the sale price.');
      setTimeout(() => setUploadStatusMsg(null), 3000);
      return;
    }

    if (!Number.isFinite(parsedStockCount) || parsedStockCount < 0) {
      setUploadStatusMsg('Inventory must be a valid non-negative number.');
      setTimeout(() => setUploadStatusMsg(null), 3000);
      return;
    }

    if (imageGallery.length === 0) {
      setUploadStatusMsg('Please upload at least one product image before saving.');
      setTimeout(() => setUploadStatusMsg(null), 3000);
      return;
    }

    const sku = editingProduct
      ? editingProduct.sku
      : `BS-${category.substring(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const productPayload: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      sku,
      name: trimmedName,
      tagline: tagline.trim(),
      category,
      subcategory: subcategory.trim(),
      price: parsedPrice,
      originalPrice: parsedOriginalPrice > 0 ? parsedOriginalPrice : undefined,
      images: allVariantImages,
      fabric: fabric.trim(),
      color: color.trim(),
      colorVariants: savedVariants,
      occasion: occasion.trim(),
      description: description.trim(),
      craftDetails: craftDetails.length ? craftDetails : [],
      careInstructions: careInstructions.trim(),
      availableSizes: mergedSizes,
      sizeChart: chartToSave,
      customSizeChart,
      inStock: inStock && sizeStockTotal > 0,
      stockCount: sizeStockTotal,
      isBestSeller,
      isNewArrival,
      isCustomizable: false,
      customizationBasePrice: 0,
      rating: editingProduct ? editingProduct.rating : 5.0,
      reviewCount: editingProduct ? editingProduct.reviewCount : 1,
      reviews: editingProduct ? editingProduct.reviews : [],
      isActive: true,
    };

    const saved = editingProduct
      ? await onUpdateProduct(productPayload)
      : await onAddProduct(productPayload);

    if (!saved) {
      setUploadStatusMsg('Product could not be saved. Check your admin permissions and try again.');
      return;
    }

    setShowAddProductModal(false);
    setEditingProduct(null);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setTagline(prod.tagline);
    setCategory(prod.category);
    setSubcategory(prod.subcategory);
    setPrice(prod.price);
    setOriginalPrice(prod.originalPrice || prod.price);
    setImageGallery([...prod.images]);
    setImageUrlInput('');
    setFabric(prod.fabric);
    setColor(prod.color);
    const variants = prod.colorVariants?.length ? prod.colorVariants : [{ id: `variant-${prod.id}`, name: prod.color, images: prod.images }];
    setColorVariants(variants);
    setActiveColorVariantId(variants[0].id);
    setImageGallery([...variants[0].images]);
    setOccasion(prod.occasion);
    setDescription(prod.description);
    setCraftDetails(prod.craftDetails ?? []);
    setCareInstructions(prod.careInstructions || '');
    setAvailableSizes(prod.availableSizes.join(', '));
    setSizeChart(prod.sizeChart && prod.sizeChart.length > 0 ? prod.sizeChart : prod.availableSizes.map((size) => ({ size, available: true, stock: prod.stockCount }))); 
    setCustomSizeChart(prod.customSizeChart);
    setStockCount(prod.stockCount);
    setInStock(prod.inStock);
    setIsBestSeller(Boolean(prod.isBestSeller));
    setIsNewArrival(Boolean(prod.isNewArrival));
    setShowAddProductModal(true);
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setName('');
    setTagline('');
    setCategory('sarees');
    setSubcategory('');
    setPrice(0);
    setOriginalPrice(0);
    setImageGallery([]);
    setImageUrlInput('');
    setFabric('');
    setColor('');
    setColorVariants([{ ...initialColorVariant, images: [] }]);
    setActiveColorVariantId(initialColorVariant.id);
    setOccasion('');
    setDescription('');
    setCraftDetails([]);
    setCareInstructions('');
    setAvailableSizes('');
    setSizeChart([]);
    setCustomSizeChart(undefined);
    setStockCount(0);
    setInStock(true);
    setIsBestSeller(false);
    setIsNewArrival(false);
    setShowAddProductModal(true);
  };

  // KPIs
  const totalRevenue = orders.reduce((acc, o) => acc + (o.paymentStatus === 'Paid' ? o.totalAmount : 0), 0);
  const activeOrdersCount = orders.filter((o) => o.orderStatus !== 'Delivered' && o.orderStatus !== 'Cancelled').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-stretch justify-center animate-in fade-in duration-200">
      <div 
        id="admin-owner-portal"
        className="relative bg-[#F5F2ED] w-full min-h-screen border-x border-[#DCD7D0] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#2A2A2A] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#404040] text-[#A68A64] flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif italic text-lg text-white">
                  {isAdminLoggedIn ? 'Brand Owner Management' : 'Staff & Owner Sign In'}
                </h1>
                <span className={`px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-widest ${
                  isAdminLoggedIn ? 'bg-[#404040] text-[#A68A64]' : 'bg-[#333333] text-[#8C857D]'
                }`}>
                  {isAdminLoggedIn ? 'Active' : 'Locked'}
                </span>
              </div>
              <p className="text-[10px] text-[#A68A64] uppercase tracking-wider">
                {isAdminLoggedIn ? 'Multi-Image Catalog • Orders' : 'Secure Passcode Authentication Required'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdminLoggedIn && (
              <button
                onClick={onAdminLogout}
                className="text-xs text-[#DCD7D0] hover:text-white flex items-center gap-1 px-2.5 py-1 bg-[#404040] cursor-pointer"
              >
                <LogOut size={12} />
                <span className="text-[10px] uppercase tracking-wider">Logout</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 text-[#DCD7D0] hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        {!isAdminLoggedIn ? (
          /* Authentication Screen */
          <div className="flex-1 p-8 flex items-center justify-center">
            <div className="max-w-md w-full bg-[#EAE5DF] p-8 border border-[#DCD7D0] text-center space-y-5">
              <div className="w-12 h-12 bg-[#F5F2ED] text-[#2A2A2A] mx-auto flex items-center justify-center border border-[#DCD7D0]">
                <ShieldCheck size={24} />
              </div>

              <div>
                <h2 className="font-serif italic text-2xl text-[#2A2A2A]">Brand Sign In</h2>
                <p className="text-xs text-[#6B655E] mt-1 font-light">
                  Access the product catalog, live orders, and store settings.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4 text-left text-xs">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B655E] mb-1 font-bold">Admin Email</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="admin@yourbrand.com"
                    className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2.5 text-xs text-[#2A2A2A] focus:outline-none focus:border-[#2A2A2A]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#6B655E] mb-1 font-bold">Password</label>
                  <div className="relative">
                    <input
                      type={isPasswordVisible ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2.5 pr-10 text-xs text-[#2A2A2A] focus:outline-none focus:border-[#2A2A2A]"
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
                  <span className="text-[10px] text-[#6B655E] mt-1 block">
                    Use the password for the authorized admin account in Supabase Auth.
                  </span>
                </div>

                {loginError && (
                  <p className="text-xs text-[#2A2A2A] font-bold">{loginError}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-[#2A2A2A] hover:bg-[#404040] text-white text-[10px] font-bold uppercase tracking-[0.2em] cursor-pointer"
                >
                  Enter Portal
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Logged In Dashboard */
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Top Navigation Tabs */}
            <div className="bg-[#EAE5DF] px-6 border-b border-[#DCD7D0] flex items-center space-x-6 text-[10px] font-bold uppercase tracking-[0.2em] overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: Sparkles },
                { id: 'products', label: `Catalog (${products.length})`, icon: Package },
                { id: 'orders', label: `Orders (${orders.length})`, icon: Truck },
                { id: 'tracking', label: 'Live Tracking', icon: MapPin },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'overview' | 'products' | 'orders' | 'tracking' | 'settings')}
                    className={`py-3.5 flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-[#2A2A2A] text-[#2A2A2A]'
                        : 'border-transparent text-[#6B655E] hover:text-[#2A2A2A]'
                    }`}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Main Tab Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-[#EAE5DF] p-4 border border-[#DCD7D0]">
                      <span className="text-[10px] uppercase tracking-wider text-[#6B655E] block font-bold">Gross Sales</span>
                      <p className="font-serif italic text-2xl text-[#2A2A2A] mt-1 font-bold">
                        {formatCurrency(totalRevenue, 'INR')}
                      </p>
                      <span className="text-[10px] text-[#6B655E] font-mono">{orders.length} orders total</span>
                    </div>

                    <div className="bg-[#EAE5DF] p-4 border border-[#DCD7D0]">
                      <span className="text-[10px] uppercase tracking-wider text-[#6B655E] block font-bold">Active Pipeline</span>
                      <p className="font-serif italic text-2xl text-[#A68A64] mt-1 font-bold">
                        {activeOrdersCount} Orders
                      </p>
                      <span className="text-[10px] text-[#6B655E]">In crafting & transit</span>
                    </div>

                    <div className="bg-[#EAE5DF] p-4 border border-[#DCD7D0]">
                      <span className="text-[10px] uppercase tracking-wider text-[#6B655E] block font-bold">Active Catalog</span>
                      <p className="font-serif italic text-2xl text-[#2A2A2A] mt-1 font-bold">
                        {products.length} SKUs
                      </p>
                      <span className="text-[10px] text-[#6B655E]">Multi-photo gallery active</span>
                    </div>
                  </div>

                  {/* Recent Orders Snapshot & Quick Actions */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 bg-[#EAE5DF] p-5 border border-[#DCD7D0] space-y-3">
                      <div className="flex justify-between items-center">
                        <h2 className="font-bold text-[10px] uppercase tracking-[0.2em] text-[#2A2A2A]">Recent Orders</h2>
                        <button
                          onClick={() => setActiveTab('orders')}
                          className="text-[10px] uppercase tracking-wider text-[#A68A64] hover:underline font-bold cursor-pointer"
                        >
                          View All →
                        </button>
                      </div>

                      <div className="space-y-2">
                        {orders.slice(0, 3).map((ord) => (
                          <div key={ord.id} className="p-3 bg-[#F5F2ED] border border-[#DCD7D0] flex items-center justify-between text-xs">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#2A2A2A]">#{ord.orderNumber}</span>
                                <span className="text-[#6B655E]">• {ord.customer.name}</span>
                              </div>
                              <p className="text-[10px] text-[#6B655E] uppercase tracking-wider">{ord.items.length} item(s) • {ord.paymentMethod.toUpperCase()}</p>
                            </div>

                            <div className="text-right">
                              <span className="font-bold text-[#2A2A2A] block">{formatCurrency(ord.totalAmount, 'INR')}</span>
                              <span className="text-[9px] px-2 py-0.5 bg-[#2A2A2A] text-white uppercase font-bold">
                                {ord.orderStatus}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-4 bg-[#EAE5DF] p-5 border border-[#DCD7D0] space-y-3">
                      <h2 className="font-bold text-[10px] uppercase tracking-[0.2em] text-[#2A2A2A]">Quick Actions</h2>
                      
                      <button
                        onClick={openNewProductModal}
                        className="w-full py-2.5 px-4 bg-[#2A2A2A] hover:bg-[#404040] text-white text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Upload Product Photos</span>
                      </button>

                      <div className="p-3 bg-[#F5F2ED] border border-[#DCD7D0] text-[10px] text-[#2A2A2A] flex items-center gap-2">
                        <MessageCircle size={14} className="text-[#25D366]" />
                        <span>WhatsApp helpline: <strong>{whatsappHelpline}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PRODUCTS MANAGER & MULTI-IMAGE UPLOADER */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search size={13} className="absolute left-3 top-2.5 text-[#6B655E]" />
                      <input
                        type="text"
                        placeholder="Search products by title, fabric, or Product ID..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full bg-[#EAE5DF] border border-[#DCD7D0] pl-8 pr-3 py-1.5 text-xs text-[#2A2A2A] focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={openNewProductModal}
                      className="px-4 py-2 bg-[#2A2A2A] text-white text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-1.5 cursor-pointer hover:bg-[#404040]"
                    >
                      <Plus size={13} />
                      <span>Upload New Product</span>
                    </button>
                  </div>

                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-[#6B655E] cursor-pointer">
                    <input type="checkbox" checked={showDeactivated} onChange={(e) => setShowDeactivated(e.target.checked)} />
                    Show deactivated products
                  </label>

                  {/* Products Table */}
                  <div className="bg-[#EAE5DF] border border-[#DCD7D0] overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#DCD7D0] text-[#2A2A2A] uppercase tracking-[0.2em] text-[9px] font-bold border-b border-[#DCD7D0]">
                        <tr>
                          <th className="p-3">Product & Gallery</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Price</th>
                          <th className="p-3">Stock</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCD7D0]">
                        {products
                          .filter((p) => showDeactivated || p.isActive !== false)
                          .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.category.includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
                          .map((prod) => (
                            <tr key={prod.id} className={`hover:bg-[#F5F2ED] transition-colors ${prod.isActive === false ? 'opacity-50' : ''}`}>
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <img
                                      src={prod.images[0]}
                                      alt={prod.name}
                                      className="w-12 h-14 object-cover border border-[#DCD7D0]"
                                    />
                                    {prod.images.length > 1 && (
                                      <span className="absolute -bottom-1 -right-1 px-1 bg-[#2A2A2A] text-white text-[8px] font-mono font-bold">
                                        +{prod.images.length - 1}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-bold text-[#2A2A2A] block">
                                      {prod.name}
                                      {prod.isActive === false && (
                                        <span className="ml-2 px-1.5 py-0.5 bg-[#6B655E] text-white text-[8px] uppercase font-bold tracking-wider align-middle">Deactivated</span>
                                      )}
                                    </span>
                                    <span className="text-[10px] text-[#6B655E] font-mono">
                                      {prod.sku} • {prod.fabric} • {prod.images.length} photo{prod.images.length > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 uppercase text-[10px] font-medium text-[#6B655E]">{prod.category}</td>
                              <td className="p-3 font-bold text-[#2A2A2A]">₹{prod.price.toLocaleString('en-IN')}</td>
                              <td className="p-3">
                                <span className={`font-mono text-xs ${prod.stockCount > 0 ? 'text-[#2A2A2A]' : 'text-[#6B655E]'}`}>
                                  {prod.stockCount} in stock
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => openEditModal(prod)}
                                    className="p-1.5 text-[#2A2A2A] hover:bg-[#DCD7D0] cursor-pointer"
                                    title="Edit Product & Photos"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  {prod.isActive === false ? (
                                    <button
                                      onClick={() => onUpdateProduct({ ...prod, isActive: true })}
                                      className="p-1.5 text-[#2A2A2A] hover:bg-[#DCD7D0] cursor-pointer"
                                      title="Restore Product"
                                    >
                                      <CheckCircle2 size={13} />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (window.confirm(`Deactivate "${prod.name}"? It will be hidden from the storefront but can be restored later.`)) {
                                          onDeleteProduct(prod.id);
                                        }
                                      }}
                                      className="p-1.5 text-[#6B655E] hover:text-[#2A2A2A] cursor-pointer"
                                      title="Delete Product"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: ORDER FULFILLMENT & WHATSAPP TRACKING */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#6B655E]">Filter:</span>
                      {['All', 'Order Placed', 'Crafting & Stitching', 'Dispatched', 'Delivered'].map((st) => (
                        <button
                          key={st}
                          onClick={() => setOrderStatusFilter(st)}
                          className={`text-[10px] uppercase tracking-wider px-3 py-1 border transition-all cursor-pointer ${
                            orderStatusFilter === st
                              ? 'bg-[#2A2A2A] text-white border-[#2A2A2A] font-bold'
                              : 'bg-[#EAE5DF] text-[#2A2A2A] border-[#DCD7D0]'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Orders Table */}
                  <div className="bg-[#EAE5DF] border border-[#DCD7D0] overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#DCD7D0] text-[#2A2A2A] uppercase tracking-[0.2em] text-[9px] font-bold border-b border-[#DCD7D0]">
                        <tr>
                          <th className="p-3">Order Ref</th>
                          <th className="p-3">Client</th>
                          <th className="p-3">Items</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Status Pipeline</th>
                          <th className="p-3 text-right">WhatsApp Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCD7D0]">
                        {orders
                          .filter((o) => orderStatusFilter === 'All' || o.orderStatus === orderStatusFilter)
                          .map((ord) => (
                            <React.Fragment key={ord.id}>
                              <tr className="hover:bg-[#F5F2ED] transition-colors">
                              <td className="p-3">
                                <strong className="font-mono text-[#2A2A2A] block">#{ord.orderNumber}</strong>
                                <span className="text-[10px] text-[#6B655E]">{ord.date}</span>
                              </td>
                              <td className="p-3">
                                <span className="font-medium text-[#2A2A2A] block">{ord.customer.name}</span>
                                <span className="text-[10px] text-[#6B655E] font-mono">{ord.customer.phone}</span>
                              </td>
                              <td className="p-3">
                                <div className="space-y-1">
                                  {ord.items.map((it, i) => (
                                    <div key={i} className="text-[11px] border-b border-[#DCD7D0] last:border-b-0 pb-1 last:pb-0">
                                      <span className="font-medium block">{it.product.name}</span>
                                      <span className="text-[10px] text-[#6B655E]">
                                        {it.selectedSize ? `Size: ${it.selectedSize} • ` : ''}Qty: {it.quantity} • {formatCurrency(it.itemTotal, 'INR')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="text-[9px] uppercase tracking-wider text-[#6B655E] block">Order total</span>
                                <strong className="text-[#2A2A2A] block font-mono">{formatCurrency(ord.totalAmount, 'INR')}</strong>
                                <span className="text-[10px] text-[#6B655E] uppercase">{ord.paymentStatus} ({ord.paymentMethod.toUpperCase()})</span>
                              </td>
                              <td className="p-3">
                                <select
                                  value={ord.orderStatus}
                                  onChange={(e) => onUpdateOrderStatus(ord.id, e.target.value as OrderStatus)}
                                  className="bg-[#F5F2ED] border border-[#DCD7D0] px-2 py-1 text-xs text-[#2A2A2A]"
                                >
                                  <option value="Order Placed">Order Placed</option>
                                  <option value="Crafting & Stitching">Crafting & Stitching</option>
                                  <option value="Quality Inspection">Quality Inspection</option>
                                  <option value="Dispatched">Dispatched</option>
                                  <option value="Delivered">Delivered</option>
                                </select>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex justify-end gap-2 flex-wrap">
                                  <button
                                    onClick={() => setTrackingOrderId(trackingOrderId === ord.id ? null : ord.id)}
                                    className="p-1.5 bg-[#A68A64] text-white cursor-pointer inline-flex items-center gap-1 text-[10px] uppercase font-bold"
                                  >
                                    <Truck size={13} />
                                    <span>{trackingOrderId === ord.id ? 'Close Tracking' : 'Manage Tracking'}</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      const msg = getOrderWhatsAppText(ord.orderNumber, ord.customer.name, ord.orderStatus);
                                      const link = generateWhatsAppLink(ord.customer.phone, msg);
                                      window.open(link, '_blank');
                                    }}
                                    className="p-1.5 bg-[#25D366] text-white cursor-pointer inline-flex items-center gap-1 text-[10px] uppercase font-bold"
                                    title="Send WhatsApp Update"
                                  >
                                    <MessageCircle size={13} />
                                    <span>Notify</span>
                                  </button>
                                </div>
                              </td>
                              </tr>
                              {trackingOrderId === ord.id && (
                                <tr>
                                  <td colSpan={6} className="p-4 bg-[#F5F2ED]">
                                    <ShipmentManagement order={ord} />
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: LIVE TRACKING WORKSPACE */}
              {activeTab === 'tracking' && (
                <div className="space-y-6">
                  <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-[#A68A64] text-[10px] uppercase tracking-[0.25em] font-bold mb-2">
                        <MapPin size={14} /> Customer-facing updates
                      </div>
                      <h2 className="font-serif italic text-3xl text-[#2A2A2A]">Live Shipment Control</h2>
                      <p className="text-xs text-[#6B655E] mt-2 max-w-xl">Select an order to create its shipment or publish the next status, location, description, and delivery estimate. Every saved update appears in Track Order.</p>
                    </div>
                    <label className="w-full lg:w-80 text-[10px] uppercase tracking-wider font-bold text-[#6B655E]">
                      Select Order
                      <select
                        value={trackingOrderId ?? ''}
                        onChange={(event) => setTrackingOrderId(event.target.value || null)}
                        className="mt-1 w-full bg-white border border-[#DCD7D0] px-3 py-2.5 text-xs text-[#2A2A2A]"
                      >
                        <option value="">Choose an order to update</option>
                        {orders.map((order) => (
                          <option key={order.id} value={order.id}>
                            {order.orderNumber} • {order.customer.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {trackingOrderId ? (
                    <div className="bg-white border border-[#DCD7D0] p-4 sm:p-6">
                      <ShipmentManagement order={orders.find((order) => order.id === trackingOrderId)!} />
                    </div>
                  ) : (
                    <div className="min-h-64 border border-dashed border-[#C9C2B9] bg-[#EAE5DF] flex items-center justify-center text-center p-8">
                      <div>
                        <Truck size={30} className="mx-auto text-[#A68A64] mb-3" />
                        <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#2A2A2A]">Choose an order to begin</p>
                        <p className="text-xs text-[#6B655E] mt-2">Shipment creation and live status controls will appear here.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: SETTINGS */}
              {activeTab === 'settings' && (
                <div className="max-w-xl space-y-6 text-xs">
                  <div className="bg-[#EAE5DF] p-5 border border-[#DCD7D0] space-y-3">
                    <h2 className="font-bold text-[10px] uppercase tracking-[0.25em] text-[#2A2A2A]">WhatsApp Integration</h2>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#6B655E] mb-1 font-bold">Store Support Number</label>
                      <input
                        type="text"
                        value={whatsappHelpline}
                        onChange={(e) => setWhatsappHelpline(e.target.value)}
                        className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2.5 text-xs text-[#2A2A2A]"
                      />
                      <p className="text-[10px] text-[#6B655E] mt-1">
                        Product inquiries and order updates redirect to this number.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#EAE5DF] p-5 border border-[#DCD7D0] space-y-3">
                    <h2 className="font-bold text-[10px] uppercase tracking-[0.25em] text-[#2A2A2A]">Payment Gateways</h2>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2.5 bg-[#F5F2ED] border border-[#DCD7D0]">
                        <span className="font-medium text-[#2A2A2A]">UPI & QR Codes (GPay, PhonePe)</span>
                        <span className="px-2 py-0.5 bg-[#2A2A2A] text-white text-[9px] font-bold uppercase tracking-wider">Active</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-[#F5F2ED] border border-[#DCD7D0]">
                        <span className="font-medium text-[#2A2A2A]">Credit & Debit Cards (3D Secure)</span>
                        <span className="px-2 py-0.5 bg-[#2A2A2A] text-white text-[9px] font-bold uppercase tracking-wider">Active</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-[#F5F2ED] border border-[#DCD7D0]">
                        <span className="font-medium text-[#2A2A2A]">Cash on Delivery</span>
                        <span className="px-2 py-0.5 bg-[#2A2A2A] text-white text-[9px] font-bold uppercase tracking-wider">Active</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Upload / Edit Product Modal with Multi-Image Capabilities */}
        {showAddProductModal && (
          <div className="fixed inset-0 z-60 overflow-y-auto bg-black/70 flex items-center justify-center p-4">
            <div className="bg-[#F5F2ED] w-full max-w-3xl border border-[#DCD7D0] shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3 border-b border-[#DCD7D0]">
                <div>
                  <h2 className="font-serif italic text-2xl text-[#2A2A2A]">
                    {editingProduct ? 'Edit Product & Gallery' : 'Upload New Product'}
                  </h2>
                </div>
                <button onClick={() => setShowAddProductModal(false)} className="p-1 text-[#2A2A2A] hover:opacity-60 cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
                {/* Product Name & Tagline */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#6B655E] mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder=""
                    className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2.5 text-xs text-[#2A2A2A]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#6B655E] mb-1">Tagline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder=""
                    className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2.5 text-xs text-[#2A2A2A]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#6B655E] mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ProductCategory)}
                      className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2 text-xs text-[#2A2A2A]"
                    >
                      <option value="sarees">Sarees</option>
                      <option value="ethnic">Ethnic</option>
                      <option value="western">Western</option>
                      <option value="accessories">Accessories</option>
                      <option value="gifts">Gifts & Novelties</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#6B655E] mb-1">Subcategory</label>
                    <input
                      type="text"
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      placeholder=""
                      className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-[10px] uppercase tracking-wider font-bold text-[#2A2A2A]">
                    <input type="checkbox" checked={isBestSeller} onChange={(e) => setIsBestSeller(e.target.checked)} />
                    Best Seller
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-[10px] uppercase tracking-wider font-bold text-[#2A2A2A]">
                    <input type="checkbox" checked={isNewArrival} onChange={(e) => setIsNewArrival(e.target.checked)} />
                    New Arrival
                  </label>
                </div>

                {/* Pricing & Stock */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#6B655E] mb-1">Price (₹) *</label>
                    <input
                      type="number"
                      required
                      value={price || ''}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      placeholder=""
                      className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#6B655E] mb-1">Original Price (₹)</label>
                    <input
                      type="number"
                      value={originalPrice || ''}
                      onChange={(e) => setOriginalPrice(Number(e.target.value))}
                      placeholder=""
                      className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#6B655E] mb-1">Inventory (Units)</label>
                    <input
                      type="number"
                      value={stockCount || ''}
                      onChange={(e) => setStockCount(Number(e.target.value))}
                      placeholder=""
                      className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* SIZE CHART & FIT GUIDE */}
                <div className="bg-[#EAE5DF] p-4 border border-[#DCD7D0] space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-[#2A2A2A]">Size Chart & Fit Guide</label>
                    <span className="text-[9px] uppercase tracking-wider text-[#6B655E]">Visible to shoppers</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-[#6B655E] mb-1">Available Sizes</label>
                      <input
                        type="text"
                        value={availableSizes}
                        onChange={(e) => {
                          const nextText = e.target.value;
                          setAvailableSizes(nextText);
                          ensureSizeChartForProduct(nextText);
                        }}
                        placeholder="S, M, L, XL, XXL"
                        className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-[#6B655E] mb-1">Occasion / Festive</label>
                      <input
                        type="text"
                        value={occasion}
                        onChange={(e) => setOccasion(e.target.value)}
                        placeholder=""
                        className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {(sizeChart.length > 0 ? sizeChart : westernSizeOptions.map((size) => ({ size, available: true, stock: 5 }))).map((entry) => {
                      const isSelected = normalizeSizeInput(availableSizes).includes(entry.size);
                      return (
                        <button
                          key={entry.size}
                          type="button"
                          onClick={() => toggleWesternSize(entry.size)}
                          className={`px-2 py-2 border text-[10px] font-bold uppercase tracking-wide cursor-pointer ${isSelected ? 'bg-[#2A2A2A] text-white border-[#2A2A2A]' : 'border-[#DCD7D0] text-[#2A2A2A] bg-[#F5F2ED]'}`}
                        >
                          <div>{entry.size}</div>
                          <small className="block text-[8px] opacity-80">{isSelected ? 'Added' : 'Add'}</small>
                        </button>
                      );
                    })}
                  </div>

                  {sizeChart.length > 0 && (
                    <div className="rounded border border-[#DCD7D0] bg-[#F5F2ED] p-2">
                      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-[#2A2A2A] mb-2">
                        <span>Size</span>
                        <span>Stock</span>
                        <span>Available</span>
                      </div>
                      <div className="space-y-2">
                        {sizeChart.map((entry) => (
                          <div key={entry.size} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-[10px] uppercase tracking-wider">
                            <span className="font-bold text-[#2A2A2A]">{entry.size}</span>
                            <input
                              type="number"
                              min={0}
                              value={entry.stock}
                              onChange={(e) => updateSizeChartEntry(entry.size, { stock: Math.max(0, Number(e.target.value) || 0) })}
                              className="w-16 bg-white border border-[#DCD7D0] p-1 text-xs text-[#2A2A2A]"
                            />
                            <label className="flex items-center gap-1 text-[#6B655E]">
                              <input type="checkbox" checked={entry.available} onChange={(e) => updateSizeChartEntry(entry.size, { available: e.target.checked })} />
                              <span>Yes</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-[#DCD7D0] pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-[#2A2A2A]">Custom Size Chart</label>
                      <button type="button" onClick={() => updateCustomChart({ rows: normalizeSizeInput(availableSizes).map((size) => ({ size, measurements: {} })) })} className="text-[9px] uppercase tracking-wider font-bold text-[#A68A64]">{customSizeChart ? 'Update Chart' : 'Add Chart'}</button>
                    </div>
                    {customSizeChart && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <input value={customSizeChart.name} onChange={(e) => updateCustomChart({ name: e.target.value })} placeholder="Chart name" className="bg-[#F5F2ED] border border-[#DCD7D0] p-2 text-xs" />
                          <input value={customSizeChart.unit} onChange={(e) => updateCustomChart({ unit: e.target.value })} placeholder="Unit (cm)" className="bg-[#F5F2ED] border border-[#DCD7D0] p-2 text-xs" />
                          <input value={customSizeChart.measurementFields.join(', ')} onChange={(e) => updateCustomChart({ measurementFields: e.target.value.split(',').map((field) => field.trim()).filter(Boolean) })} placeholder="Chest, Waist, Length" className="bg-[#F5F2ED] border border-[#DCD7D0] p-2 text-xs" />
                        </div>
                        <input value={customSizeChart.description} onChange={(e) => updateCustomChart({ description: e.target.value })} placeholder="Instructions for shoppers" className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2 text-xs" />
                        <div className="overflow-x-auto">
                          <table className="w-full text-[10px]">
                            <thead><tr><th className="text-left p-1">Size</th>{customSizeChart.measurementFields.map((field) => <th key={field} className="text-left p-1">{field}</th>)}</tr></thead>
                            <tbody>{customSizeChart.rows.map((row) => <tr key={row.size}>
                              <td className="p-1 font-bold">{row.size}</td>
                              {customSizeChart.measurementFields.map((field) => <td key={field} className="p-1"><input value={row.measurements[field] ?? ''} onChange={(e) => updateCustomChart({ rows: customSizeChart.rows.map((candidate) => candidate.size === row.size ? { ...candidate, measurements: { ...candidate.measurements, [field]: e.target.value } } : candidate) })} className="w-20 bg-white border border-[#DCD7D0] p-1" /></td>)}
                            </tr>)}</tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* MULTI-IMAGE UPLOAD SUITE */}
                <div className="bg-[#EAE5DF] p-4 border border-[#DCD7D0] space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={16} className="text-[#2A2A2A]" />
                      <label className="text-[10px] uppercase tracking-wider font-bold text-[#2A2A2A]">
                        {color.trim() || 'Unnamed colour'} Image Gallery ({imageGallery.length} photo{imageGallery.length === 1 ? '' : 's'})
                      </label>
                    </div>

                    {imageGallery.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllImages}
                        className="text-[9px] uppercase tracking-wider text-[#6B655E] hover:text-[#2A2A2A] font-bold cursor-pointer"
                      >
                        Clear All Photos
                      </button>
                    )}
                  </div>

                  {/* Drag & Drop Multi-Image Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed p-5 text-center cursor-pointer transition-all ${
                      isDraggingImages 
                        ? 'border-[#2A2A2A] bg-[#DCD7D0]' 
                        : 'border-[#DCD7D0] bg-[#F5F2ED] hover:border-[#2A2A2A]'
                    }`}
                  >
                    <Upload size={22} className="mx-auto text-[#2A2A2A] mb-1.5" />
                    <p className="font-bold text-xs text-[#2A2A2A]">
                      Upload product photos
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageFileInput}
                      className="hidden"
                    />
                  </div>

                  {/* Bulk / Single URL Input */}
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-[#6B655E] mb-1 font-bold">
                      Add image URLs
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste one or more image URLs"
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        className="flex-1 bg-[#F5F2ED] border border-[#DCD7D0] p-2 text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrls}
                        className="px-4 bg-[#2A2A2A] text-white text-[10px] uppercase tracking-wider font-bold hover:bg-[#404040] cursor-pointer whitespace-nowrap"
                      >
                        Add URL(s)
                      </button>
                    </div>
                  </div>

                  {/* Feedback Status Message */}
                  {uploadStatusMsg && (
                    <div className="p-2 bg-[#F5F2ED] border border-[#2A2A2A] text-xs text-[#2A2A2A] flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-[#2A2A2A]" />
                      <span>{uploadStatusMsg}</span>
                    </div>
                  )}

                  {/* Multi-Image Preview & Management Grid */}
                  {imageGallery.length > 0 ? (
                    <div className="pt-2 space-y-2">
                      <span className="block text-[9px] uppercase tracking-wider text-[#6B655E] font-bold">
                        Attached Images
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {imageGallery.map((img, idx) => (
                          <div 
                            key={idx} 
                            className={`relative bg-[#F5F2ED] border ${
                              idx === 0 ? 'border-[#2A2A2A] ring-1 ring-[#2A2A2A]' : 'border-[#DCD7D0]'
                            } p-1 group`}
                          >
                            <div className="w-full h-28 overflow-hidden relative">
                              <img 
                                src={img} 
                                alt={`Product view ${idx + 1}`} 
                                className="w-full h-full object-cover" 
                              />

                              {idx === 0 && (
                                <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-[#2A2A2A] text-white text-[8px] uppercase font-bold tracking-wider flex items-center gap-0.5">
                                  <Star size={8} className="fill-white" />
                                  <span>Cover</span>
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 bg-black/80 hover:bg-black text-white p-1 transition-colors cursor-pointer"
                                title="Remove photo"
                              >
                                <X size={11} />
                              </button>
                            </div>

                            {/* Image Controls: Reorder & Set as Cover */}
                            <div className="mt-1 flex items-center justify-between text-[9px] pt-1 border-t border-[#DCD7D0]">
                              {idx !== 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setCoverImage(idx)}
                                  className="text-[#A68A64] hover:underline font-bold uppercase cursor-pointer"
                                >
                                  Set Cover
                                </button>
                              ) : (
                                <span className="text-[#6B655E] text-[8px] uppercase">Primary</span>
                              )}

                              <div className="flex items-center gap-1">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => moveImage(idx, 'left')}
                                    className="p-0.5 hover:bg-[#DCD7D0] cursor-pointer"
                                    title="Move left"
                                  >
                                    <ArrowLeft size={10} />
                                  </button>
                                )}
                                {idx < imageGallery.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => moveImage(idx, 'right')}
                                    className="p-0.5 hover:bg-[#DCD7D0] cursor-pointer"
                                    title="Move right"
                                  >
                                    <ArrowRight size={10} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#F5F2ED] border border-[#DCD7D0] text-center text-[#6B655E] text-[10px]">
                      No photos attached
                    </div>
                  )}
                </div>

                {/* Fabric & Color */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#6B655E] mb-1">Fabric & Weave</label>
                    <input
                      type="text"
                      value={fabric}
                      onChange={(e) => setFabric(e.target.value)}
                      placeholder=""
                      className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#6B655E] mb-1">Color Name</label>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => {
                        const nextColor = e.target.value;
                        setColor(nextColor);
                        if (activeColorVariantId) {
                          setColorVariants((variants) => variants.map((variant) => (
                            variant.id === activeColorVariantId ? { ...variant, name: nextColor } : variant
                          )));
                        }
                      }}
                      placeholder="Name the selected colour variant"
                      className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#6B655E] mb-1">In Stock</label>
                    <label className="flex items-center gap-2 h-10 px-3 border border-[#DCD7D0] bg-[#F5F2ED] text-xs">
                      <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
                      <span>{inStock ? 'Available' : 'Out of stock'}</span>
                    </label>
                  </div>
                </div>

                {/* COLOR VARIANTS */}
                <div className="bg-[#EAE5DF] p-4 border border-[#DCD7D0] space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[10px] uppercase tracking-wider font-bold text-[#2A2A2A]">Colour Variants</h3>
                    </div>
                    <button
                      type="button"
                      onClick={addColorVariant}
                      className="px-3 py-2 bg-[#2A2A2A] text-white text-[9px] uppercase tracking-wider font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} /> Add Colour
                    </button>
                  </div>

                  {colorVariants.length > 0 && (
                    <div className="space-y-2">
                      {colorVariants.map((variant) => (
                        <div key={variant.id} className={`flex items-center gap-2 p-2 border ${activeColorVariantId === variant.id ? 'border-[#2A2A2A] bg-[#F5F2ED]' : 'border-[#DCD7D0] bg-[#F5F2ED]'}`}>
                          <button
                            type="button"
                            onClick={() => selectColorVariant(variant)}
                            className="flex flex-1 items-center gap-2 text-left cursor-pointer min-w-0"
                          >
                            <span className="w-5 h-5 border border-[#DCD7D0] bg-[#DCD7D0] shrink-0" />
                            <span className="truncate text-xs text-[#2A2A2A]">{variant.name}</span>
                            <span className="text-[9px] text-[#6B655E] ml-auto shrink-0">{activeColorVariantId === variant.id ? imageGallery.length : variant.images.length} photo{(activeColorVariantId === variant.id ? imageGallery.length : variant.images.length) === 1 ? '' : 's'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              selectColorVariant(variant);
                              window.setTimeout(() => fileInputRef.current?.click(), 0);
                            }}
                            className="px-2 py-1 text-[9px] uppercase tracking-wider font-bold text-[#2A2A2A] border border-[#DCD7D0] hover:border-[#2A2A2A] cursor-pointer inline-flex items-center gap-1"
                            title={`Add photos to ${variant.name || 'this colour variant'}`}
                          >
                            <ImageIcon size={11} /> Add Photo
                          </button>
                          <button
                            type="button"
                            onClick={() => removeColorVariant(variant.id)}
                            className="p-1 text-[#6B655E] hover:text-[#2A2A2A] cursor-pointer"
                            title="Remove colour variant"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ALL PHOTOS ACROSS COLOURS — lets the admin review every uploaded image regardless of which colour variant is active */}
                {colorVariants.some(v => (v.id === activeColorVariantId ? imageGallery.length : v.images.length) > 0) && (
                  <div className="bg-[#EAE5DF] p-4 border border-[#DCD7D0] space-y-3">
                    <h3 className="text-[10px] uppercase tracking-wider font-bold text-[#2A2A2A]">
                      All Photos Across Colours ({colorVariants.reduce((sum, v) => sum + (v.id === activeColorVariantId ? imageGallery.length : v.images.length), 0)} total)
                    </h3>
                    <div className="space-y-3">
                      {colorVariants.map((variant) => {
                        const images = variant.id === activeColorVariantId ? imageGallery : variant.images;
                        if (images.length === 0) return null;
                        return (
                          <div key={variant.id} className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-3.5 h-3.5 border border-[#DCD7D0] bg-[#DCD7D0] shrink-0" />
                              <span className="text-[9px] uppercase tracking-wider font-bold text-[#2A2A2A]">{variant.name}</span>
                              <span className="text-[9px] text-[#6B655E]">({images.length} photo{images.length === 1 ? '' : 's'})</span>
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                              {images.map((img, i) => (
                                <div key={i} className="w-full h-16 bg-[#F5F2ED] border border-[#DCD7D0] overflow-hidden">
                                  <img src={img} alt={`${variant.name} view ${i + 1}`} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Available Sizes & Occasion */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#6B655E] mb-1">Occasion / Festive</label>
                    <input
                      type="text"
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                      placeholder=""
                      className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2 text-xs"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#6B655E] mb-1">Product Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder=""
                    className="w-full bg-[#F5F2ED] border border-[#DCD7D0] p-2.5 text-xs text-[#2A2A2A]"
                  />
                </div>

                {/* Save Actions */}
                <div className="flex justify-end gap-3 pt-3 border-t border-[#DCD7D0]">
                  <button
                    type="button"
                    onClick={() => setShowAddProductModal(false)}
                    className="px-4 py-2 border border-[#DCD7D0] text-[10px] uppercase tracking-wider font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#2A2A2A] hover:bg-[#404040] text-white text-[10px] font-bold uppercase tracking-[0.2em] cursor-pointer"
                  >
                    Save Product ({imageGallery.length} photo{imageGallery.length === 1 ? '' : 's'})
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
