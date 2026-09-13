import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroBanner } from './components/HeroBanner';
import { AboutUs } from './components/AboutUs';
import { CategoryNav } from './components/CategoryNav';
import { ProductCard } from './components/ProductCard';
import { ProductDetailsModal } from './components/ProductDetailsModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { AdminPortal } from './components/AdminPortal';
import { UserAccountModal } from './components/UserAccountModal';
import { WhatsAppWidget } from './components/WhatsAppWidget';
import { Footer } from './components/Footer';
import { OrderTrackingPage } from './components/OrderTrackingPage';
import { supabase } from './lib/supabase';
import { shipmentService } from './lib/shipmentService';


import { 
  Product, 
  CartItem, 
  Order, 
  UserProfile, 
  ProductCategory, 
  CustomizationDetails, 
  OrderStatus,
  ShipmentStatus,
  Review,
  ProductSizeEntry,
  buildSizeChart,
  normalizeProductSizeChart,
} from './types';
import { generateWhatsAppLink, getOrderDetailsWhatsAppText, getOrderEmailText } from './utils/formatters';

const normalizeAvailableSizes = (sizes: unknown) => {
  const rawSizes = Array.isArray(sizes)
    ? sizes
    : typeof sizes === 'string'
      ? sizes.split(',')
      : [];

  const mapped = rawSizes
    .map((size) => String(size).trim())
    .filter(Boolean)
    .map((size) => size.toUpperCase().replace(/\s+/g, ''))
    .filter((size) => size.length > 0);

  const deduped = Array.from(new Set(mapped));
  if (deduped.length > 0) return deduped;

  return [];
};

const mapProductRow = (item: any): Product => {
  const configuredSizes = Array.isArray(item.product_sizes) && item.product_sizes.length > 0
    ? item.product_sizes.map((row: any) => ({
      id: row.id,
      size: String(row.size_name ?? '').trim(),
      available: row.is_available !== false,
      stock: Math.max(0, Number(row.stock_count) || 0),
      sortOrder: Number(row.sort_order) || 0,
    })).filter((entry: ProductSizeEntry) => entry.size)
    : undefined;
  const availableSizes = configuredSizes?.length
    ? configuredSizes.map((entry: ProductSizeEntry) => entry.size)
    : normalizeAvailableSizes(item.available_sizes);
  const sizeChart = configuredSizes?.length
    ? configuredSizes
    : normalizeProductSizeChart(item.size_chart, availableSizes);
  const stockCount = Number(item.stock_count) || sizeChart.reduce((sum, entry) => sum + (entry.available ? Math.max(entry.stock, 0) : 0), 0) || (availableSizes.length ? 1 : 0);

  return {
    id: String(item.id ?? ''),
    sku: item.sku || `SKU-${String(item.id ?? 'product').slice(0, 8)}`,
    name: item.name ?? '',
    tagline: item.tagline ?? '',
    category: (item.category as ProductCategory) || 'sarees',
    subcategory: item.subcategory ?? '',
    price: Number(item.price) || 0,
    originalPrice: item.original_price == null ? undefined : Number(item.original_price),
    images: item.images?.length ? item.images : item.image_url ? [item.image_url] : [],
    fabric: item.fabric ?? '',
    color: item.color ?? '',
    colorVariants: item.color_variants ?? undefined,
    occasion: item.occasion ?? '',
    description: item.description ?? '',
    craftDetails: item.craft_details ?? [],
    careInstructions: item.care_instructions ?? '',
    availableSizes,
    hasSizes: item.has_sizes ?? availableSizes.length > 0,
    hasColors: item.has_colors ?? (Array.isArray(item.color_variants) && item.color_variants.length > 0),
    sizeChartEnabled: item.size_chart_enabled ?? Boolean(item.custom_size_chart),
    sizeChart,
    inStock: item.in_stock ?? stockCount > 0,
    stockCount,
    isBestSeller: item.is_best_seller ?? false,
    isNewArrival: item.is_new_arrival ?? false,
    isCustomizable: item.is_customizable ?? false,
    rating: Number(item.rating) || 0,
    reviewCount: Number(item.review_count) || 0,
    reviews: (item.reviews ?? []).map((review: any): Review => ({
      id: review.id,
      author: review.author ?? '',
      rating: Number(review.rating) || 0,
      date: review.date ?? review.created_at ?? '',
      comment: review.comment ?? '',
      verified: review.verified ?? false,
      location: review.location ?? undefined,
    })),
    customizationBasePrice: item.customization_base_price == null ? undefined : Number(item.customization_base_price),
    isActive: item.is_active ?? true,
    customSizeChart: item.custom_size_chart ?? undefined,
  };
};

const mapOrderRow = (row: any): Order => ({
  id: row.id,
  orderNumber: row.order_number,
  date: row.order_date || row.created_at,
  customer: row.customer ?? {},
  items: (row.order_items ?? []).map((item: any): CartItem => ({
    id: item.id,
    productId: item.product_id,
    product: mapProductRow(item.product_snapshot ?? {}),
    selectedSize: item.selected_size,
    selectedColor: item.selected_color,
    quantity: item.quantity,
    isCustomized: item.is_customized,
    customization: item.customization ?? undefined,
    customizationFee: Number(item.customization_fee) || 0,
    itemTotal: Number(item.item_total) || 0,
  })),
  subtotal: Number(row.subtotal) || 0,
  discount: Number(row.discount) || 0,
  couponCode: row.coupon_code ?? undefined,
  shippingFee: Number(row.shipping_fee) || 0,
  totalAmount: Number(row.total_amount) || 0,
  paymentMethod: row.payment_method,
  paymentStatus: row.payment_status,
  orderStatus: row.order_status,
  trackingNumber: row.tracking_number ?? undefined,
  courierPartner: row.courier_partner ?? undefined,
  estimatedDelivery: row.estimated_delivery ?? '',
  whatsappUpdates: row.whatsapp_updates ?? false,
  notes: row.notes ?? undefined,
  timeline: row.timeline ?? [],
  shipmentId: row.shipment_id ?? undefined,
});

const sendBusinessEmail = async (event: string, to: string, subject: string, text: string) => {
  const { error } = await supabase.functions.invoke('send-business-email', {
    body: { event, to, subject, text },
  });
  if (error) console.error(`Failed to send ${event} email:`, error);
};

export default function App() {
  // 1. Products State - loaded from Supabase
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);

  const loadProducts = async () => {
    setIsProductsLoading(true);
    const { data, error } = await supabase.from('products').select('*, reviews(*)');

    if (error || !data) {
      console.error('Could not load products from Supabase.', error);
      setProducts([]);
      setIsProductsLoading(false);
      return;
    }

    const productIds = (data ?? []).map((item: any) => item.id).filter(Boolean);
    const { data: sizeRows } = productIds.length
      ? await supabase.from('product_sizes').select('*').in('product_id', productIds).order('sort_order')
      : { data: [] };
    const sizesByProduct = new Map<string, any[]>();
    (sizeRows ?? []).forEach((row: any) => {
      const rows = sizesByProduct.get(String(row.product_id)) ?? [];
      rows.push(row);
      sizesByProduct.set(String(row.product_id), rows);
    });
    setProducts((data ?? []).map((item: any) => mapProductRow({
      ...item,
      product_sizes: sizesByProduct.get(String(item.id)),
    })));
    setIsProductsLoading(false);
  };
  useEffect(() => {
    loadProducts();
  }, []);
  // 2. Orders State - loaded from Supabase
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);

  const loadOrders = async () => {
    setIsOrdersLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load orders:', error);
      setOrders([]);
    } else {
      setOrders((data ?? []).map(mapOrderRow));
    }
    setIsOrdersLoading(false);
  };

  // 3. Persistent Shopping Bag
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('Bhuvisrienterprises_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 4. Persistent Wishlist
  const [wishlist, setWishlist] = useState<Product[]>([]);

  // 5. User Profile & Admin Auth
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const applySupabaseSession = (session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) => {
      if (!isMounted) return;

      if (!session?.user) {
        setCurrentUser(null);
        setIsAdminLoggedIn(false);
        setWishlist([]);
        return;
      }

      const metadata = session.user.user_metadata ?? {};
      supabase.from('user_profiles').select('id, name, email, phone, role').eq('id', session.user.id).maybeSingle().then(async ({ data, error }) => {
        if (error) {
          console.error('Failed to load user profile:', error);
          return;
        }

        const profile = data ?? (await supabase.from('user_profiles').insert({
          id: session.user.id,
          name: String(metadata.full_name ?? metadata.name ?? session.user.email?.split('@')[0] ?? 'Valued Client'),
          email: session.user.email ?? '',
          phone: String(metadata.phone ?? ''),
        }).select('id, name, email, phone, role').single()).data;

        if (!profile) return;

        // admin_users membership is the single source of truth for admin access (kept in sync with handleAdminLogin).
        const { data: adminRow } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle();
        const isAdmin = Boolean(adminRow);

        setCurrentUser({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          role: isAdmin ? 'admin' : 'customer',
        });
        setIsAdminLoggedIn(isAdmin);
      });

      supabase.from('wishlist').select('product_id, products(*)').eq('user_id', session.user.id).then(({ data, error }) => {
        if (error) {
          console.error('Failed to load wishlist:', error);
          return;
        }
        setWishlist((data ?? []).map((item: any) => mapProductRow(item.products)));
      });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySupabaseSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        applySupabaseSession(session);
      } else if (isMounted) {
        setCurrentUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (currentUser) loadOrders();
  }, [currentUser]);

  // Cart is temporary browser UI state; business records are stored in Supabase.
  useEffect(() => {
    localStorage.setItem('Bhuvisrienterprises_cart', JSON.stringify(cart));
  }, [cart]);

  // Currency State
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  // Navigation & Filtering State
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all'>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('All Items');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [fabricFilter, setFabricFilter] = useState('All Fabrics');
  const [colorFilter, setColorFilter] = useState('All Colors');
  const [sizeFilters, setSizeFilters] = useState<string[]>([]);
  const [pricePreset, setPricePreset] = useState('All Prices');
  const [maxPriceFilter, setMaxPriceFilter] = useState(100000);
  const [brandFilter, setBrandFilter] = useState('All Brands');
  const [fitFilter, setFitFilter] = useState('All Fits');
  const [materialFilter, setMaterialFilter] = useState('All Materials');
  const [occasionFilter, setOccasionFilter] = useState('All Occasions');
  const [offerFilter, setOfferFilter] = useState('All Offers');
  const [availabilityFilter, setAvailabilityFilter] = useState('All Availability');

  // Coupons
  const [couponCode, setCouponCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  // Modals / Drawers State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [isUserAccountOpen, setIsUserAccountOpen] = useState(false);
  const [activePage, setActivePage] = useState<'home' | 'about' | 'tracking'>('home');

  // Wishlist handler
  const handleToggleWishlist = async (prod: Product) => {
    if (!currentUser) return;

    const exists = wishlist.some((p) => p.id === prod.id);
    const result = exists
      ? await supabase.from('wishlist').delete().eq('user_id', currentUser.id).eq('product_id', prod.id)
      : await supabase.from('wishlist').insert({ user_id: currentUser.id, product_id: prod.id });

    if (result.error) {
      console.error('Failed to update wishlist:', result.error);
      return;
    }

    setWishlist(exists ? wishlist.filter((p) => p.id !== prod.id) : [...wishlist, prod]);
  };

  // Add to Bag Handlers
  const getVariantAwareProduct = (prod: Product, selectedColor?: string): Product => {
    const normalizedColor = selectedColor?.trim();
    const matchingVariant = prod.colorVariants?.find((variant) => {
      const variantName = variant.name?.trim();
      return variantName && normalizedColor && variantName.toLowerCase() === normalizedColor.toLowerCase();
    });

    if (!matchingVariant) {
      return prod;
    }

    const variantImages = matchingVariant.images?.length ? matchingVariant.images : prod.images;

    return {
      ...prod,
      color: matchingVariant.name || prod.color,
      colorVariants: [matchingVariant],
      images: variantImages,
    };
  };

  const handleAddToCartSimple = (prod: Product, selectedColor?: string) => {
    if (prod.availableSizes.length > 0) {
      setSelectedProduct(prod);
      setIsProductModalOpen(true);
      return;
    }
    handleAddToCartDetailed(prod, '', false, undefined, 0, selectedColor);
    setIsCartOpen(true);
  };

  const handleAddToCartDetailed = (
    prod: Product,
    size: string,
    isCustomized: boolean,
    customization?: CustomizationDetails,
    customizationFee: number = 0,
    selectedColor?: string
  ) => {
    const normalizedSize = size.trim();
    const selectedEntry = prod.sizeChart?.find((entry) => entry.size.toLowerCase() === normalizedSize.toLowerCase());
    if (prod.availableSizes.length > 0 && (!selectedEntry || !selectedEntry.available || selectedEntry.stock < 1)) return;
    const chosenColor = selectedColor || prod.color;
    const productSnapshot = getVariantAwareProduct(prod, chosenColor);
    const itemTotal = (productSnapshot.price + customizationFee);
    const cartItemId = `${prod.id}-${chosenColor}-${normalizedSize}-${isCustomized ? JSON.stringify(customization) : 'std'}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.id === cartItemId);
      if (existingIdx > -1) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + 1;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          itemTotal: (productSnapshot.price + customizationFee) * newQty
        };
        return updated;
      } else {
        const newItem: CartItem = {
          id: cartItemId,
          productId: prod.id,
          product: productSnapshot,
          selectedSize: normalizedSize,
          selectedColor: chosenColor,
          quantity: 1,
          isCustomized,
          customization,
          customizationFee,
          itemTotal
        };
        return [...prev, newItem];
      }
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === cartItemId) {
          const unitPrice = item.product.price + item.customizationFee;
          return {
            ...item,
            quantity: newQty,
            itemTotal: unitPrice * newQty
          };
        }
        return item;
      })
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== cartItemId));
  };

  // Coupon Logic
  const handleApplyCoupon = (code: string) => {
    const subtotal = cart.reduce((acc, i) => acc + i.itemTotal, 0);
    if (code === 'BHUVI10') {
      const disc = Math.round(subtotal * 0.1);
      setDiscountAmount(disc);
      setCouponCode(code);
      return { success: true, message: `✨ Coupon BHUVI10 applied! 10% discount (-₹${disc.toLocaleString('en-IN')})` };
    } else if (code === 'BHUVI15') {
      const disc = Math.round(subtotal * 0.15);
      setDiscountAmount(disc);
      setCouponCode(code);
      return { success: true, message: `✨ Coupon BHUVI15 applied! 15% discount (-₹${disc.toLocaleString('en-IN')})` };
    }
    return { success: false, message: 'Invalid coupon code. Try BHUVI10 or BHUVI15.' };
  };

  // Order Placement
  const handleOrderPlaced = async (order: Order): Promise<boolean> => {
    const { data: savedOrder, error: orderError } = await supabase.rpc('create_order_with_inventory', {
      p_order: {
        user_id: currentUser?.id ?? null,
        order_number: order.orderNumber,
        order_date: order.date,
        customer: order.customer,
        subtotal: order.subtotal,
        discount: order.discount,
        coupon_code: order.couponCode ?? null,
        shipping_fee: order.shippingFee,
        total_amount: order.totalAmount,
        payment_method: order.paymentMethod,
        payment_status: order.paymentStatus,
        order_status: order.orderStatus,
        tracking_number: order.trackingNumber ?? null,
        courier_partner: order.courierPartner ?? null,
        estimated_delivery: order.estimatedDelivery,
        whatsapp_updates: order.whatsappUpdates,
        notes: order.notes ?? null,
        timeline: order.timeline,
      },
      p_items: order.items.map((item) => ({
        product_id: item.productId,
        product_snapshot: item.product,
        selected_size: item.selectedSize || null,
        selected_color: item.selectedColor ?? null,
        quantity: item.quantity,
        is_customized: item.isCustomized,
        customization: item.customization ?? null,
        customization_fee: item.customizationFee,
        item_total: item.itemTotal,
      })),
    });

    if (orderError || !savedOrder) {
      console.error('Failed to create order:', orderError);
      return false;
    }

    await loadOrders();
    await sendBusinessEmail(
      'order_confirmation',
      order.customer.email,
      `Order confirmation ${order.orderNumber}`,
      getOrderEmailText(order),
    );
    setCart([]);
    setDiscountAmount(0);
    setCouponCode('');
    return true;
  };

  // Product Add / Update / Delete (Brand Owner)
  const getSupabaseProductPayload = (product: Product) => ({
    sku: product.sku,
    name: product.name,
    tagline: product.tagline,
    subcategory: product.subcategory,
    description: product.description,
    price: product.price,
    original_price: product.originalPrice ?? null,
    category: product.category,
    images: product.images,
    fabric: product.fabric,
    color: product.color,
    color_variants: product.colorVariants ?? [],
    occasion: product.occasion,
    craft_details: product.craftDetails,
    care_instructions: product.careInstructions,
    available_sizes: product.availableSizes,
    size_chart: product.sizeChart ?? buildSizeChart(product.availableSizes, product.name, product.subcategory),
    in_stock: product.inStock,
    stock_count: product.stockCount,
    is_best_seller: product.isBestSeller ?? false,
    is_new_arrival: product.isNewArrival ?? false,
    is_customizable: product.isCustomizable,
    rating: product.rating,
    review_count: product.reviewCount,
    customization_base_price: product.customizationBasePrice ?? null,
    is_active: product.isActive ?? true,
    custom_size_chart: product.customSizeChart ?? null,
    has_sizes: product.hasSizes ?? product.availableSizes.length > 0,
    has_colors: product.hasColors ?? Boolean(product.colorVariants?.length),
    size_chart_enabled: product.sizeChartEnabled ?? Boolean(product.customSizeChart),
  });

  const saveProductSizes = async (product: Product) => {
    const { error: deleteError } = await supabase.from('product_sizes').delete().eq('product_id', product.id);
    if (deleteError && deleteError.code !== '42P01') {
      console.error('Failed to clear product sizes:', deleteError);
      return false;
    }
    if (product.availableSizes.length === 0) return true;
    const rows = product.availableSizes.map((size, index) => {
      const entry = product.sizeChart?.find((candidate) => candidate.size.toLowerCase() === size.toLowerCase());
      return {
        product_id: product.id,
        size_name: size,
        stock_count: Math.max(0, Number(entry?.stock) || 0),
        is_available: entry?.available !== false,
        sort_order: index,
      };
    });
    const { error } = await supabase.from('product_sizes').insert(rows);
    if (error) console.error('Failed to save product sizes:', error);
    return !error;
  };

  const handleAddProduct = async (newProd: Product): Promise<boolean> => {
    const payload = getSupabaseProductPayload(newProd);
    const { data: existingProduct, error: lookupError } = await supabase
      .from('products')
      .select('id')
      .eq('name', payload.name)
      .eq('price', payload.price)
      .eq('category', payload.category)
      .maybeSingle();

    if (lookupError) {
      console.error('Failed to check for an existing product:', lookupError);
      return false;
    }

    if (existingProduct) {
      console.warn('A product with the same name, price, and category already exists:', existingProduct.id);
      return false;
    }

    if (!existingProduct) {
      const { data: insertedProduct, error } = await supabase.from('products').insert(payload).select('id').single();
      if (error || !insertedProduct) {
        console.error('Failed to create product:', error);
        return false;
      }
      newProd.id = insertedProduct.id;
    }
    if (!(await saveProductSizes({ ...newProd, id: newProd.id }))) return false;

    await loadProducts();
    return true;
  };

  const handleUpdateProduct = async (updatedProd: Product): Promise<boolean> => {
    const { data, error } = await supabase
      .from('products')
      .update(getSupabaseProductPayload(updatedProd))
      .eq('id', updatedProd.id)
      .select('id')
      .maybeSingle();

    if (error || !data) {
      console.error('Failed to update product:', error);
      return false;
    }

    if (!(await saveProductSizes(updatedProd))) return false;

    await loadProducts();
    return true;
  };

  const handleDeleteProduct = async (prodId: string) => {
    const { error } = await supabase
      .from('products')
      .update({
        is_active: false,
        in_stock: false,
        stock_count: 0,
      })
      .eq('id', prodId);

    if (error) {
      console.error('Failed to deactivate product:', error);
      setProducts((prev) => prev.map((product) =>
        product.id === prodId
          ? { ...product, isActive: false, inStock: false, stockCount: 0 }
          : product
      ));
      return;
    }

    await loadProducts();
  };

  // Order status update (Brand Owner)
  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus, trackingNumber?: string, courierPartner?: string) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;
    const updatedTimeline = order.timeline.map((step) => step.status === newStatus
      ? { ...step, completed: true, timestamp: 'Updated by Atelier' }
      : step);
    supabase.from('orders').update({
      order_status: newStatus,
      tracking_number: trackingNumber || order.trackingNumber || null,
      courier_partner: courierPartner || order.courierPartner || null,
      timeline: updatedTimeline,
    }).eq('id', orderId).then(({ error }) => {
      if (error) console.error('Failed to update order status:', error);
      else {
        loadOrders();
        if (order.shipmentId) {
          const shipmentStatusMap: Partial<Record<OrderStatus, ShipmentStatus>> = {
            'Order Placed': 'ORDER_PLACED',
            'Crafting & Stitching': 'PROCESSING',
            'Quality Inspection': 'PACKED',
            Dispatched: 'SHIPPED',
            Delivered: 'DELIVERED',
            Cancelled: 'CANCELLED',
          };
          const shipmentStatus = shipmentStatusMap[newStatus];
          if (shipmentStatus) void shipmentService.addTrackingEvent(order.shipmentId, shipmentStatus, undefined, `Order status updated to ${newStatus}.`);
        }
        void sendBusinessEmail(
          'order_status_update',
          order.customer.email,
          `Order update ${order.orderNumber}`,
          `Your BhuviSri Enterprises order ${order.orderNumber} is now ${newStatus}.`,
        );
      }
    });
  };

  // Admin login
  const handleAdminLogin = async (email: string, password: string): Promise<{ success: boolean; reason?: 'invalid_credentials' | 'not_authorized' | 'error' }> => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return { success: false, reason: 'invalid_credentials' };

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (error || !data.user) return { success: false, reason: 'invalid_credentials' };

    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (adminError) {
      console.error('Failed to verify admin authorization:', adminError);
      return { success: false, reason: 'error' };
    }

    if (!admin) return { success: false, reason: 'not_authorized' };

    setIsAdminLoggedIn(true);
    return { success: true };
  };

  const handleAdminLogout = async () => {
    await supabase.auth.signOut();
    setIsAdminLoggedIn(false);
  };

  const handleUserLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setWishlist([]);
  };

  // Review submission
  const handleAddReview = async (productId: string, reviewData: Omit<Review, 'id' | 'date' | 'verified'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('reviews').insert({
      user_id: user.id,
      product_id: productId,
      author: reviewData.author,
      rating: reviewData.rating,
      comment: reviewData.comment,
      location: reviewData.location ?? null,
      verified: true,
    });
    if (error) {
      console.error('Failed to create review:', error);
      return;
    }
    await loadProducts();
  };

  // Filtering products
  const filteredProducts = products.filter((p) => {
    // Deactivated products stay visible to admins in Supabase RLS, so hide them from the storefront view explicitly.
    if (p.isActive === false) return false;
    // Category
    if (activeCategory !== 'all' && p.category !== activeCategory) {
      return false;
    }
    // Subcategory
    if (selectedSubcategory && !selectedSubcategory.startsWith('All') && p.subcategory !== selectedSubcategory) {
      return false;
    }
    // Fabric
    if (fabricFilter && fabricFilter !== 'All Fabrics') {
      if (!p.fabric.toLowerCase().includes(fabricFilter.toLowerCase())) {
        return false;
      }
    }
    if (colorFilter && colorFilter !== 'All Colors' && p.color.toLowerCase() !== colorFilter.toLowerCase()) {
      return false;
    }
    if (sizeFilters.length > 0 && !sizeFilters.some((size) => p.availableSizes.some((availableSize) => availableSize.toLowerCase().startsWith(size.toLowerCase())))) return false;
    if (pricePreset !== 'All Prices') {
      const inPreset = pricePreset === 'under_499' ? p.price < 499
        : pricePreset === '500_999' ? p.price >= 500 && p.price <= 999
        : pricePreset === '1000_1999' ? p.price >= 1000 && p.price <= 1999
        : pricePreset === '2000_3999' ? p.price >= 2000 && p.price <= 3999
        : p.price >= 4000;
      if (!inPreset) return false;
    }
    if (p.price > maxPriceFilter) return false;
    if (brandFilter !== 'All Brands' && brandFilter !== 'BhuviSri Enterprises') return false;
    if (fitFilter !== 'All Fits') {
      const inferredFit = p.category === 'accessories' || p.category === 'gifts' ? 'Relaxed' : 'Regular';
      if (inferredFit !== fitFilter) return false;
    }
    if (materialFilter !== 'All Materials' && !p.fabric.toLowerCase().includes(materialFilter.toLowerCase())) return false;
    if (occasionFilter !== 'All Occasions' && !p.occasion.toLowerCase().includes(occasionFilter.toLowerCase())) return false;
    if (offerFilter === 'On Sale' && !p.originalPrice) return false;
    if (offerFilter === '20%+ Off' && (!p.originalPrice || ((p.originalPrice - p.price) / p.originalPrice) < 0.2)) return false;
    if (offerFilter === '40%+ Off' && (!p.originalPrice || ((p.originalPrice - p.price) / p.originalPrice) < 0.4)) return false;
    if (offerFilter === '50%+ Off' && (!p.originalPrice || ((p.originalPrice - p.price) / p.originalPrice) < 0.5)) return false;
    if (offerFilter === 'Clearance' && !p.isNewArrival && !p.originalPrice) return false;
    if (availabilityFilter === 'In stock' && !p.inStock) return false;
    if (availabilityFilter === 'New arrivals' && !p.isNewArrival) return false;
    if (availabilityFilter === 'Pre-order' && p.inStock) return false;
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.fabric.toLowerCase().includes(q) ||
        p.color.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'price_low') return a.price - b.price;
    if (sortBy === 'price_high') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'newest') return (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0);
    if (sortBy === 'best_selling') return (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0);
    if (sortBy === 'discount') return ((b.originalPrice ? (b.originalPrice - b.price) / b.originalPrice : 0) - (a.originalPrice ? (a.originalPrice - a.price) / a.originalPrice : 0));
    return 0; // featured
  });
  const colorOptions = ['All Colors', ...Array.from(new Set(products.map((product) => product.color.trim()).filter(Boolean))).sort()];
  const maxCatalogPrice = Math.max(4000, ...products.map((product) => product.price));

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#2D2824]">
      
      {/* Navigation Header */}
      <Navbar
        activeCategory={activeCategory}
        onSelectCategory={(cat) => {
          setActivePage('home');
          setActiveCategory(cat);
          setSelectedSubcategory('All Items');
        }}
        cartCount={cart.reduce((acc, i) => acc + i.quantity, 0)}
        wishlistCount={wishlist.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenWishlist={() => setIsUserAccountOpen(true)}
        onOpenAdmin={() => setIsAdminPortalOpen(true)}
        onOpenUserAccount={() => setIsUserAccountOpen(true)}
        onOpenAbout={() => setActivePage('about')}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currency={currency}
        onToggleCurrency={() => setCurrency(currency === 'INR' ? 'USD' : 'INR')}
        currentUser={currentUser}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Main Page Body */}
      <main className="flex-1">
        
        {activePage === 'about' ? (
          <AboutUs
            onBrowseCollection={() => {
              setActivePage('home');
              setTimeout(() => document.getElementById('catalog-products-grid')?.scrollIntoView({ behavior: 'smooth' }), 0);
            }}
            onBackHome={() => setActivePage('home')}
          />
        ) : activePage === 'tracking' ? (
          <OrderTrackingPage onBackHome={() => setActivePage('home')} />
        ) : <>
        {/* Editorial Hero Banner */}
        <HeroBanner
          onSelectCategory={(cat) => {
            setActivePage('home');
            setActiveCategory(cat);
            setSelectedSubcategory('All Items');
            const el = document.getElementById('catalog-products-grid');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Category & Filters Section */}
        <CategoryNav
          activeCategory={activeCategory}
          onSelectCategory={(cat) => {
            setActivePage('home');
            setActiveCategory(cat);
            setSelectedSubcategory('All Items');
          }}
          selectedSubcategory={selectedSubcategory}
          onSelectSubcategory={setSelectedSubcategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
          fabricFilter={fabricFilter}
          onFabricFilterChange={setFabricFilter}
          colorFilter={colorFilter}
          onColorFilterChange={setColorFilter}
          colorOptions={colorOptions}
          sizeFilters={sizeFilters}
          onSizeFiltersChange={setSizeFilters}
          pricePreset={pricePreset}
          onPricePresetChange={setPricePreset}
          maxPriceFilter={maxPriceFilter}
          maxCatalogPrice={maxCatalogPrice}
          onMaxPriceChange={setMaxPriceFilter}
          brandFilter={brandFilter}
          onBrandFilterChange={setBrandFilter}
          fitFilter={fitFilter}
          onFitFilterChange={setFitFilter}
          materialFilter={materialFilter}
          onMaterialFilterChange={setMaterialFilter}
          occasionFilter={occasionFilter}
          onOccasionFilterChange={setOccasionFilter}
          offerFilter={offerFilter}
          onOfferFilterChange={setOfferFilter}
          availabilityFilter={availabilityFilter}
          onAvailabilityFilterChange={setAvailabilityFilter}
          productCount={filteredProducts.length}
        />

        {/* Products Grid Section */}
        <section id="catalog-products-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          
          {searchQuery && (
            <div className="mb-6 flex items-center justify-between bg-[#EAE5DF] p-3 border border-[#DCD7D0] text-xs">
              <span className="text-[#2A2A2A]">Showing search results for: <strong>"{searchQuery}"</strong></span>
              <button 
                onClick={() => setSearchQuery('')}
                className="text-[#A68A64] hover:underline uppercase tracking-wider font-bold text-[10px] cursor-pointer"
              >
                Clear Search
              </button>
            </div>
          )}

          {isProductsLoading ? (
            <div className="text-center py-20 bg-[#EAE5DF] border border-[#DCD7D0]">
              <p className="font-serif italic text-2xl text-[#2A2A2A]">Loading collection...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-[#EAE5DF] border border-[#DCD7D0] space-y-4">
              <p className="font-serif italic text-2xl text-[#2A2A2A]">
                {products.length === 0 ? 'Your collection is empty.' : 'No items found.'}
              </p>
              <p className="text-xs text-[#6B655E] max-w-sm mx-auto font-light">
                {products.length === 0
                  ? 'Add your first product from the admin portal to publish it here.'
                  : "We couldn't find matching items with current filters. Try resetting the filters or enquire directly on WhatsApp."}
              </p>
              <button
                onClick={() => {
                  setActiveCategory('all');
                  setSelectedSubcategory('All Items');
                  setFabricFilter('All Fabrics');
                  setColorFilter('All Colors');
                  setSizeFilters([]);
                  setPricePreset('All Prices');
                  setMaxPriceFilter(100000);
                  setBrandFilter('All Brands');
                  setFitFilter('All Fits');
                  setMaterialFilter('All Materials');
                  setOccasionFilter('All Occasions');
                  setOfferFilter('All Offers');
                  setAvailabilityFilter('All Availability');
                  setSearchQuery('');
                }}
                className="px-6 py-2.5 bg-[#2A2A2A] text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#404040] cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 sm:gap-8">
              {filteredProducts.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  currency={currency}
                  isWishlisted={wishlist.some((w) => w.id === prod.id)}
                  onToggleWishlist={handleToggleWishlist}
                  onQuickView={(p) => {
                    setSelectedProduct(p);
                    setIsProductModalOpen(true);
                  }}
                  onAddToCart={handleAddToCartSimple}
                />
              ))}
            </div>
          )}
        </section>
        </>}

      </main>

      {/* Footer */}
      <Footer
        onOpenAdmin={() => setIsAdminPortalOpen(true)}
        onOpenTracking={() => setActivePage('tracking')}
      />

      {/* Floating WhatsApp Concierge Widget */}
      <WhatsAppWidget />

      {/* Modals & Slide-Overs */}

      {/* 1. Product Details Modal */}
      <ProductDetailsModal
        product={selectedProduct}
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setSelectedProduct(null);
        }}
        currency={currency}
        isWishlisted={selectedProduct ? wishlist.some((w) => w.id === selectedProduct.id) : false}
        onToggleWishlist={handleToggleWishlist}
        onAddToCart={handleAddToCartDetailed}
        onAddReview={handleAddReview}
      />

      {/* 2. Shopping Bag Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        currency={currency}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedCheckout={() => setIsCheckoutOpen(true)}
        couponCode={couponCode}
        onApplyCoupon={handleApplyCoupon}
        discount={discountAmount}
      />

      {/* 3. Secure Checkout & Payment Gateway */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cart}
        currency={currency}
        discount={discountAmount}
        couponCode={couponCode}
        onOrderPlaced={handleOrderPlaced}
        initialCustomer={currentUser ? {
          name: currentUser.name,
          email: currentUser.email,
          phone: currentUser.phone
        } : undefined}
      />

      {/* 4. Brand Owner / Admin Portal */}
      <AdminPortal
        isOpen={isAdminPortalOpen}
        onClose={() => setIsAdminPortalOpen(false)}
        products={products}
        orders={orders}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        isAdminLoggedIn={isAdminLoggedIn}
        onAdminLogin={handleAdminLogin}
        onAdminLogout={handleAdminLogout}
      />

      {/* 5. Customer Account & Order History Modal */}
      <UserAccountModal
        isOpen={isUserAccountOpen}
        onClose={() => setIsUserAccountOpen(false)}
        currentUser={currentUser}
        onLogin={(usr) => setCurrentUser(usr)}
        onLogout={handleUserLogout}
        orders={orders}
        wishlist={wishlist}
        currency={currency}
        onOpenProduct={(p) => {
          setSelectedProduct(p);
          setIsProductModalOpen(true);
        }}
      />

    </div>
  );
}
