import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import Razorpay from 'razorpay';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const port = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use(express.static(distDir));

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return keyId && keySecret ? new Razorpay({ key_id: keyId, key_secret: keySecret }) : null;
};

app.post('/api/create-order', async (req, res) => {
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
});

app.post('/api/verify-payment', (req, res) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
  if (!secret) {
    res.status(401).json({ error: 'Payment service is not configured.' });
    return;
  }
  if (typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string') {
    res.status(400).json({ error: 'Missing payment verification fields.' });
    return;
  }
  const expectedSignature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  const signaturesMatch = expectedSignature.length === signature.length
    && crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  if (!signaturesMatch) {
    res.status(400).json({ error: 'Payment signature verification failed.' });
    return;
  }
  res.status(200).json({ verified: true, payment_id: paymentId, order_id: orderId });
});

// SPA fallback: send index.html for any route not matching a static file.
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
