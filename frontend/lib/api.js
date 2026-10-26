// KisanSetu -- real API bridge, replacing the localStorage mock.
//
// Built directly against the actual call sites in app/page.js, app/book/page.js,
// app/operator/page.js, app/operator/procurement/[bookingId]/page.js, app/admin/page.js,
// and app/status/[bookingId]/page.js -- not just the handoff report's summary -- so every
// method name, argument shape, and return shape matches exactly what those pages call.

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const api = {
  // Request a verification code (local terminal mock or configured SMS provider).
  async sendOtp({ phone }) {
    return request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  // Verify the code server-side. Existing farmers receive their profile; new farmers
  // receive a short-lived registration proof that is required to create their profile.
  async verifyOtp({ phone, code }) {
    return request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  },

  async registerFarmer({ phone, name, language, verificationToken }) {
    return request('/auth/register-farmer', {
      method: 'POST',
      body: JSON.stringify({ phone, name, language, verificationToken }),
    });
  },

  // Retained for the existing seeded operator/admin demo login only.
  async login({ phone, name, role = 'farmer' }) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, name, role }),
    });
  },

  // api.getCentres()
  async getCentres() {
    return request('/centres');
  },

  // api.getAvailability(centreId, date)
  async getAvailability(centreId, date) {
    return request(`/centres/${centreId}/availability?date=${date}`);
  },

  // api.createBooking({ farmer_id, centre_id, crop, quantity_kg, booking_date, slot_start, slot_end })
  async createBooking(bookingData) {
    return request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  },

  // api.getFarmerBookings(farmerId)
  async getFarmerBookings(farmerId) {
    return request(`/bookings?farmer_id=${farmerId}`);
  },

  // api.getBooking(bookingId) -- also called with a raw token string from the operator's
  // token-search box, so if the direct lookup 404s, fall back to resolving it as a token
  // for the logged-in operator's centre, today.
  async getBooking(bookingIdOrToken) {
    try {
      return await request(`/bookings/${bookingIdOrToken}`);
    } catch (err) {
      const stored = typeof window !== 'undefined' && (localStorage.getItem('ks_operator') || localStorage.getItem('ks_user'));
      if (stored) {
        const operator = JSON.parse(stored);
        if (operator.centre_id) {
          const today = new Date().toISOString().slice(0, 10);
          return request(`/bookings/lookup?centre_id=${operator.centre_id}&date=${today}&token_no=${bookingIdOrToken}`);
        }
      }
      throw err;
    }
  },

  // Public, privacy-filtered booking details used by shareable QR links.
  async getPublicBooking(bookingId) {
    return request(`/bookings/public/${encodeURIComponent(bookingId)}`);
  },

  // api.getQueue(bookingId)
  async getQueue(bookingId) {
    return request(`/queue/${bookingId}`);
  },

  // api.markArrival(bookingId)
  async markArrival(bookingId) {
    return request(`/queue/${bookingId}/arrival`, { method: 'POST' });
  },

  // api.weigh(bookingId, weight)
  async weigh(bookingId, weight) {
    return request(`/procurement/${bookingId}/weigh`, {
      method: 'POST',
      body: JSON.stringify({ actual_weight_kg: weight }),
    });
  },

  // api.quality(bookingId, grade, rate)
  async quality(bookingId, grade, rate) {
    return request(`/procurement/${bookingId}/quality`, {
      method: 'POST',
      body: JSON.stringify({ quality_grade: grade, rate_per_kg: rate }),
    });
  },

  // api.completeProcurement(bookingId)
  async completeProcurement(bookingId) {
    return request(`/procurement/${bookingId}/complete`, { method: 'POST' });
  },

  // api.getPayment(bookingId) -- backend keys payments by procurement id, but every
  // booking-returning endpoint already carries payment_status/total_amount/payment_ref
  // flattened on, so build the { payment } shape straight from the booking record.
  async getPayment(bookingId) {
    const { booking } = await request(`/bookings/${bookingId}`);
    return {
      payment: {
        status: booking.payment_status,
        amount: booking.total_amount,
        reference_id: booking.payment_ref,
      },
    };
  },

  // api.getDashboard() for admin, api.getDashboard(centreId) for operator
  async getDashboard(centreId) {
    if (centreId) return request(`/operator/dashboard?centre_id=${centreId}`);
    return request('/admin/dashboard');
  },

  // api.getAnalytics(centreId, days)
  async getAnalytics(centreId, days = 7) {
    const params = new URLSearchParams({ days });
    if (centreId) params.set('centre_id', centreId);
    return request(`/admin/analytics?${params.toString()}`);
  },

  // Not seen at a call site yet, but documented in the handoff report -- kept for safety.
  async getMarketRates() {
    return request('/market-rates');
  },
};
