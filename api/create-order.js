import { getRazorpayClient } from './_razorpay.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const razorpay = getRazorpayClient();
  if (!razorpay) {
    res.status(401).json({ error: 'Payment service is not configured.' });
    return;
  }

  const amount = Number(req.body?.amount);
  const currency = typeof req.body?.currency === 'string' ? req.body.currency.toUpperCase() : 'INR';
  const receipt = typeof req.body?.receipt === 'string' && req.body.receipt.trim()
    ? req.body.receipt.trim().slice(0, 40)
    : `receipt_${Date.now()}`;

  if (!Number.isInteger(amount) || amount < 100) {
    res.status(400).json({ error: 'Amount must be at least 100 paise.' });
    return;
  }

  try {
    const order = await razorpay.orders.create({ amount, currency, receipt });
    res.status(200).json({ order_id: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    const status = Number(error?.statusCode) === 401 ? 401 : 500;
    console.error('Payment order creation failed:', error);
    res.status(status).json({ error: 'Unable to create payment order.' });
  }
}
