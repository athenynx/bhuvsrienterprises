export const formatCurrency = (amount: number, currency: 'INR' | 'USD' = 'INR'): string => {
  if (currency === 'USD') {
    const usd = (amount / 86).toFixed(0);
    return `$${Number(usd).toLocaleString('en-US')}`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const STORE_WHATSAPP_NUMBER = '918008889317';

export const generateWhatsAppLink = (phone: string = STORE_WHATSAPP_NUMBER, message: string): string => {
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  const cleanPhone = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly.replace(/^0(?=\d{10}$)/, '91');
  const encodedMsg = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
};

export const getProductWhatsAppText = (productName: string, sku: string, price: number, url?: string): string => {
  return `Hello BhuviSri Enterprises ! \nI am interested in *${productName}* (SKU: ${sku}, Price: ₹${price.toLocaleString('en-IN')}).\nCan you please share more details, fabric video drape or size consultation?`;
};

export const getOrderWhatsAppText = (orderNumber: string, customerName: string, status: string): string => {
  return `Namaste ${customerName}! \nYour BhuviSri Enterprises Order *#${orderNumber}* status update: *${status}*.\nWe are carefully preparing and packing your pieces. Tap here to chat with our team.`;
};

export const getOrderDetailsWhatsAppText = (order: any): string => {
  const products = (order.items ?? []).map((item: any, index: number) => [
    `${index + 1}. ${item.product?.name ?? 'Product'}`,
    item.selectedColor ? `Colour: ${item.selectedColor}` : '',
    item.selectedSize ? `Size: ${item.selectedSize}` : '',
    `Quantity: ${item.quantity}`,
    `Item total: ₹${Number(item.itemTotal ?? 0).toLocaleString('en-IN')}`,
  ].filter(Boolean).join('\n')).join('\n\n');
  const customer = order.customer ?? {};
  return `Hello BhuviSri Enterprises, I would like to order.\n\nOrder: ${order.orderNumber}\n\n${products}\n\nCustomer: ${customer.name ?? ''}\nPhone: ${customer.phone ?? ''}\nEmail: ${customer.email ?? ''}\nDelivery address: ${[customer.address, customer.city, customer.state, customer.pincode, customer.country].filter(Boolean).join(', ')}\n\nSubtotal: ₹${Number(order.subtotal ?? 0).toLocaleString('en-IN')}\nShipping: ₹${Number(order.shippingFee ?? 0).toLocaleString('en-IN')}\nDiscount: ₹${Number(order.discount ?? 0).toLocaleString('en-IN')}\nTotal: ₹${Number(order.totalAmount ?? 0).toLocaleString('en-IN')}\n\nPlease confirm the order.`;
};

export const getOrderEmailText = (order: any): string => {
  const customer = order.customer ?? {};
  const products = (order.items ?? []).map((item: any, index: number) => `${index + 1}. ${item.product?.name ?? 'Product'} | Colour: ${item.selectedColor || 'N/A'} | Size: ${item.selectedSize || 'N/A'} | Qty: ${item.quantity} | Unit: ₹${Number(item.product?.price ?? 0).toLocaleString('en-IN')} | Total: ₹${Number(item.itemTotal ?? 0).toLocaleString('en-IN')}`).join('\n');
  return `NEW ORDER ${order.orderNumber}\nDate: ${order.date}\nOrder status: ${order.orderStatus}\nPayment: ${order.paymentStatus} (${order.paymentMethod})\n\nCUSTOMER\nName: ${customer.name}\nPhone: ${customer.phone}\nEmail: ${customer.email}\nAddress: ${[customer.address, customer.city, customer.state, customer.pincode, customer.country].filter(Boolean).join(', ')}\n\nPRODUCTS\n${products}\n\nFINANCIAL SUMMARY\nSubtotal: ₹${Number(order.subtotal ?? 0).toLocaleString('en-IN')}\nShipping: ₹${Number(order.shippingFee ?? 0).toLocaleString('en-IN')}\nDiscount: ₹${Number(order.discount ?? 0).toLocaleString('en-IN')}\nTotal: ₹${Number(order.totalAmount ?? 0).toLocaleString('en-IN')}\n\nNotes: ${order.notes || 'None'}`;
};

