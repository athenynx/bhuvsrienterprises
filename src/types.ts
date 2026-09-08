export type ProductCategory = 'sarees' | 'ethnic' | 'western' | 'accessories' | 'gifts' | 'custom';

export interface CustomizationDetails {
  blouseStyle?: string;
  sleeveLength?: string;
  neckline?: string;
  fallAndPico?: boolean;
  petticoatAdded?: boolean;
  monogramText?: string;
  customMeasurements?: {
    bust?: number;
    waist?: number;
    hips?: number;
    shoulder?: number;
    blouseLength?: number;
    sleeveLength?: number;
    skirtLength?: number;
    unit?: 'inches' | 'cm';
  };
  additionalNotes?: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
  location?: string;
}

export interface ProductColorVariant {
  id: string;
  name: string;
  images: string[];
}

export interface ProductSizeEntry {
  size: string;
  available: boolean;
  stock: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  tagline: string;
  category: ProductCategory;
  subcategory: string;
  price: number;
  originalPrice?: number;
  images: string[];
  fabric: string;
  color: string;
  colorVariants?: ProductColorVariant[];
  occasion: string;
  description: string;
  craftDetails: string[];
  careInstructions: string;
  availableSizes: string[];
  sizeChart?: ProductSizeEntry[];
  inStock: boolean;
  stockCount: number;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isCustomizable: boolean;
  rating: number;
  reviewCount: number;
  reviews: Review[];
  customizationBasePrice?: number;
  isActive?: boolean;
}

export const WESTERN_SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL'];

export const getWesternSizeOptions = (productName = '', subcategory = '') => {
  const combined = `${productName} ${subcategory}`.toLowerCase();
  const isWesternSizingProduct = /(t[- ]?shirt|tshirt|tee|shirt|pant|pants)/.test(combined);
  return isWesternSizingProduct ? WESTERN_SIZE_OPTIONS : [];
};

export const buildSizeChart = (availableSizes: string[], fallbackProductName = '', fallbackSubcategory = '') => {
  const normalized = Array.from(new Set((availableSizes || [])
    .map((size) => String(size).trim())
    .filter(Boolean)
    .map((size) => size.toUpperCase().replace(/\s+/g, ''))));

  const baseSizes = normalized.length > 0 ? normalized : getWesternSizeOptions(fallbackProductName, fallbackSubcategory);

  return baseSizes.map((size) => ({
    size,
    available: true,
    stock: 5,
  }));
};

export const getWesternSizeGuide = (productName = '', subcategory = '', sizeList: string[] = []) => {
  const combined = `${productName} ${subcategory}`.toLowerCase();
  const isPantProduct = /(pant|pants|trouser|jeans|chino|jogger)/.test(combined);
  const sizes = sizeList.length > 0 ? sizeList : WESTERN_SIZE_OPTIONS;
  const guide = {
    S: isPantProduct ? { waist: '28-30', length: '30' } : { chest: '36-38', length: '27' },
    M: isPantProduct ? { waist: '30-32', length: '30' } : { chest: '39-41', length: '28' },
    L: isPantProduct ? { waist: '32-34', length: '31' } : { chest: '42-44', length: '29' },
    XL: isPantProduct ? { waist: '34-36', length: '32' } : { chest: '45-47', length: '30' },
    XXL: isPantProduct ? { waist: '36-38', length: '32' } : { chest: '48-50', length: '31' },
  } as Record<string, { chest?: string; waist?: string; length: string }>;

  return sizes
    .map((size) => {
      const normalizedSize = String(size).trim().toUpperCase();
      const measurement = guide[normalizedSize] ?? { length: 'Standard' };
      return {
        size: normalizedSize,
        chest: measurement.chest ?? (isPantProduct ? '—' : '—'),
        waist: measurement.waist ?? (isPantProduct ? '—' : '—'),
        length: measurement.length,
      };
    })
    .filter((entry) => Boolean(entry.size));
};

export const normalizeProductSizeChart = (chart: unknown, availableSizes: string[] = [], fallbackProductName = '', fallbackSubcategory = '') => {
  const parsed = Array.isArray(chart)
    ? chart
    : [];

  const entries = parsed
    .map((entry: any) => {
      const size = String(entry?.size ?? '').trim().toUpperCase();
      if (!size) return null;
      return {
        size,
        available: entry?.available !== false,
        stock: Math.max(0, Number(entry?.stock) || 0),
      };
    })
    .filter(Boolean) as ProductSizeEntry[];

  if (entries.length > 0) return entries;

  return buildSizeChart(availableSizes, fallbackProductName, fallbackSubcategory);
};

export interface CartItem {
  id: string; // unique for this cart instance
  productId: string;
  product: Product;
  selectedSize: string;
  selectedColor?: string;
  quantity: number;
  isCustomized: boolean;
  customization?: CustomizationDetails;
  customizationFee: number;
  itemTotal: number;
}

export type ShipmentStatus = 
  | 'ORDER_PLACED'
  | 'PAYMENT_CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'DELIVERY_ATTEMPTED'
  | 'DELAYED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'REFUNDED';

export interface TrackingEvent {
  id: string;
  shipmentId: string;
  status: ShipmentStatus;
  location?: string;
  description: string;
  timestamp: string;
  carrierRawData?: Record<string, any>;
}

export interface Shipment {
  id: string;
  orderId: string;
  shipmentNumber: string;
  trackingNumber: string;
  carrier: string; // 'fedex', 'dhl', 'ups', 'india-post', 'xpressbees', etc.
  shippingMethod: string; // 'standard', 'express', 'overnight'
  shipmentStatus: ShipmentStatus;
  originLocation?: string;
  currentLocation?: string;
  destinationLocation?: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  carrierTrackingUrl?: string;
  trackingEvents: TrackingEvent[];
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'Order Placed' | 'Crafting & Stitching' | 'Quality Inspection' | 'Dispatched' | 'Delivered' | 'Cancelled';

export interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  customer: CustomerDetails;
  items: CartItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: 'razorpay' | 'upi' | 'card' | 'netbanking' | 'cod';
  paymentStatus: 'Paid' | 'Pending' | 'Refunded';
  orderStatus: OrderStatus;
  trackingNumber?: string;
  courierPartner?: string;
  estimatedDelivery: string;
  whatsappUpdates: boolean;
  notes?: string;
  timeline: {
    status: OrderStatus;
    timestamp: string;
    description: string;
    completed: boolean;
  }[];
  shipmentId?: string;
  shipment?: Shipment;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  savedAddresses?: CustomerDetails[];
}
