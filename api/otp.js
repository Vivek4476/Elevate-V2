// POST /api/otp  ->  stub. Real impl: generate a code, send via MSG91/Twilio/SNS,
// store a hash + expiry keyed to the employee code. Deferred per project decision.

export default function handler(req, res) {
  res.setHeader('access-control-allow-origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  return res.status(200).json({ sent: true, note: 'stub — SMS provider to be wired (deferred)' });
}
