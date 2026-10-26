import { Router } from 'express';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { query } from '../db.js';

const router = Router();
const sendAttempts = new Map();
const mockOtps = new Map();
const MOCK_OTP_TTL_MS = 5 * 60 * 1000;
const MOCK_OTP_MAX_ATTEMPTS = 5;

function otpMode() {
  const mode = String(process.env.OTP_MODE || 'twilio').trim().toLowerCase();
  if (mode === 'mock' && process.env.NODE_ENV === 'production') {
    const err = new Error('Mock OTP is disabled in production. Configure a real verification provider.');
    err.status = 503;
    throw err;
  }
  if (!['mock', 'twilio'].includes(mode)) {
    const err = new Error('Invalid OTP_MODE. Use mock for local testing or twilio for SMS verification.');
    err.status = 503;
    throw err;
  }
  return mode;
}
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_HOURLY_LIMIT = 5;
const REGISTRATION_TOKEN_TTL_SECONDS = 10 * 60;

function normalizeIndianPhone(value) {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(local)) return null;
  return { local, e164: `+91${local}` };
}

function requiredTwilioConfig() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    const err = new Error('SMS OTP is not configured. Set the Twilio Verify environment variables on the backend.');
    err.status = 503;
    throw err;
  }
  return { accountSid: TWILIO_ACCOUNT_SID, authToken: TWILIO_AUTH_TOKEN, serviceSid: TWILIO_VERIFY_SERVICE_SID };
}

async function twilioRequest(path, form) {
  const { accountSid, authToken } = requiredTwilioConfig();
  const response = await fetch(`https://verify.twilio.com/v2${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(form),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Avoid returning provider internals or credentials to the browser.
    const err = new Error(response.status === 429
      ? 'Too many OTP requests. Please wait before trying again.'
      : 'Could not process the OTP with the SMS provider. Check the backend provider configuration and try again.');
    err.status = response.status === 429 ? 429 : 502;
    console.error('Twilio Verify request failed:', response.status, data.code || 'unknown provider error');
    throw err;
  }
  return data;
}

function createRegistrationToken(phone) {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    const err = new Error('AUTH_TOKEN_SECRET must be configured with at least 32 characters.');
    err.status = 503;
    throw err;
  }
  const payload = Buffer.from(JSON.stringify({ phone, purpose: 'farmer-registration', exp: Math.floor(Date.now() / 1000) + REGISTRATION_TOKEN_TTL_SECONDS })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyRegistrationToken(token, expectedPhone) {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret || secret.length < 32 || typeof token !== 'string') return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return false;
  const expected = createHmac('sha256', secret).update(payload).digest();
  let actual;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return false; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.purpose === 'farmer-registration' && data.phone === expectedPhone && Number(data.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

async function findUserByPhone(phone) {
  return query(
    `SELECT u.*, c.name AS centre_name FROM users u
     LEFT JOIN centres c ON c.id = u.centre_id
     WHERE u.phone = $1`,
    [phone]
  );
}

// Local mock OTPs are logged only in development; Twilio Verify handles real SMS mode.
router.post('/send-otp', async (req, res, next) => {
  try {
    const normalized = normalizeIndianPhone(req.body?.phone);
    if (!normalized) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });

    const now = Date.now();
    const key = normalized.local;
    const record = sendAttempts.get(key) || { timestamps: [], lastSentAt: 0 };
    record.timestamps = record.timestamps.filter((timestamp) => now - timestamp < 60 * 60 * 1000);
    if (now - record.lastSentAt < OTP_COOLDOWN_MS) {
      return res.status(429).json({ error: 'Please wait 60 seconds before requesting another OTP.' });
    }
    if (record.timestamps.length >= OTP_HOURLY_LIMIT) {
      return res.status(429).json({ error: 'OTP request limit reached. Please try again later.' });
    }

    const mode = otpMode();
    if (mode === 'mock') {
      const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
      mockOtps.set(key, { code, expiresAt: now + MOCK_OTP_TTL_MS, attempts: 0 });
      console.log(`[MOCK OTP] +91${normalized.local}: ${code} (expires in 5 minutes)`);
      record.timestamps.push(now);
      record.lastSentAt = now;
      sendAttempts.set(key, record);
      return res.json({ ok: true, mode: 'mock', message: 'Development code generated. Check the backend terminal.' });
    }

    const { serviceSid } = requiredTwilioConfig();
    await twilioRequest(`/Services/${serviceSid}/Verifications`, { To: normalized.e164, Channel: 'sms' });
    record.timestamps.push(now);
    record.lastSentAt = now;
    sendAttempts.set(key, record);
    res.json({ ok: true, mode: 'twilio', message: 'OTP sent. Check your SMS messages.' });
  } catch (err) {
    next(err);
  }
});

// Verify the code before looking up or creating a farmer profile.
router.post('/verify-otp', async (req, res, next) => {
  try {
    const normalized = normalizeIndianPhone(req.body?.phone);
    const code = String(req.body?.code || '').trim();
    if (!normalized) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
    if (!/^\d{4,10}$/.test(code)) return res.status(400).json({ error: 'Enter the verification code from your SMS.' });

    const mode = otpMode();
    if (mode === 'mock') {
      const pending = mockOtps.get(normalized.local);
      if (!pending || Date.now() > pending.expiresAt) {
        mockOtps.delete(normalized.local);
        return res.status(401).json({ error: 'Code expired. Request a new code and try again.' });
      }
      pending.attempts += 1;
      const supplied = Buffer.from(code);
      const expected = Buffer.from(pending.code);
      const matches = supplied.length === expected.length && timingSafeEqual(supplied, expected);
      if (!matches) {
        if (pending.attempts >= MOCK_OTP_MAX_ATTEMPTS) mockOtps.delete(normalized.local);
        return res.status(401).json({ error: pending.attempts >= MOCK_OTP_MAX_ATTEMPTS ? 'Too many incorrect attempts. Request a new code.' : 'Incorrect code. Please try again.' });
      }
      mockOtps.delete(normalized.local);
    } else {
      const { serviceSid } = requiredTwilioConfig();
      const result = await twilioRequest(`/Services/${serviceSid}/VerificationCheck`, { To: normalized.e164, Code: code });
      if (result.status !== 'approved') {
        return res.status(401).json({ error: 'Incorrect or expired OTP. Request a new code and try again.' });
      }
    }

    const existing = await findUserByPhone(normalized.local);
    if (existing.rows.length > 0) {
      return res.json({ user: existing.rows[0] });
    }
    return res.json({ needsRegistration: true, verificationToken: createRegistrationToken(normalized.local) });
  } catch (err) {
    next(err);
  }
});

// First-time farmer registration is allowed only with a short-lived token issued after OTP verification.
router.post('/register-farmer', async (req, res, next) => {
  try {
    const normalized = normalizeIndianPhone(req.body?.phone);
    const name = String(req.body?.name || '').trim();
    const language = ['en', 'hi', 'te'].includes(req.body?.language) ? req.body.language : 'en';
    const { verificationToken } = req.body || {};
    if (!normalized) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
    if (!name || name.length > 120) return res.status(400).json({ error: 'Enter your name (up to 120 characters).' });
    if (!verifyRegistrationToken(verificationToken, normalized.local)) {
      return res.status(401).json({ error: 'Phone verification expired or invalid. Please verify your mobile number again.' });
    }

    const existing = await findUserByPhone(normalized.local);
    if (existing.rows.length > 0) return res.json({ user: existing.rows[0] });

    const inserted = await query(
      `INSERT INTO users (role, name, phone, language) VALUES ('farmer', $1, $2, $3) RETURNING *`,
      [name, normalized.local, language]
    );
    res.status(201).json({ user: { ...inserted.rows[0], centre_name: null } });
  } catch (err) {
    next(err);
  }
});

// Retain the existing seeded operator/admin demo entry point. Farmer login must use OTP.
router.post('/login', async (req, res, next) => {
  try {
    const normalized = normalizeIndianPhone(req.body?.phone);
    const role = req.body?.role || 'farmer';
    if (!normalized) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
    if (role === 'farmer') {
      return res.status(410).json({ error: 'Farmer login now requires SMS OTP. Use /auth/send-otp and /auth/verify-otp.' });
    }
    if (!['operator', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
    const existing = await findUserByPhone(normalized.local);
    if (existing.rows.length === 0 || existing.rows[0].role !== role) {
      return res.status(404).json({ error: `No ${role} account found for this phone number.` });
    }
    res.json({ user: existing.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
