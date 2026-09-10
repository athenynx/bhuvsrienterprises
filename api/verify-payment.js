import crypto from 'crypto';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body || {};

  if (!secret) {
    res.status(401).json({ error: 'Payment service is not configured.' });
    return;
  }

  if (typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string') {
    res.status(400).json({ error: 'Missing payment verification fields.' });
    return;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  const signaturesMatch = expectedSignature.length === signature.length
    && crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

  if (!signaturesMatch) {
    res.status(400).json({ error: 'Payment signature verification failed.' });
    return;
  }

  res.status(200).json({ verified: true, payment_id: paymentId, order_id: orderId });
}
