import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
})

export const getApiBase = () => api.defaults.baseURL

api.interceptors.response.use(
  response => response,
  error => {
    console.error('[API Error]', error.config?.url, error.response?.status, error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export const getFlights = (params) => api.get('/api/flights', { params })
export const getFlight = (id) => api.get(`/api/flights/${id}`)
export const getTrains = (params) => api.get('/api/trains', { params })
export const getTrain = (id) => api.get(`/api/trains/${id}`)
export const getBuses = (params) => api.get('/api/buses', { params })
export const getBus = (id) => api.get(`/api/buses/${id}`)
export const getPriceTrends = (params) => api.get('/api/prices/trends', { params })
export const getCurrentPrices = (params) => api.get('/api/prices/current', { params })
export const compareRoutes = (params) => api.get('/api/prices/compare', { params })
export const predictPrice = (params) => api.get('/api/prices/predict', { params })
export const getPriceCalendar = (params) => api.get('/api/prices/calendar', { params })
export const getOptimalRoute = (data) => api.post('/api/prices/optimal-route', data)
export const getBookings = (params) => api.get('/api/bookings', { params })
export const getBooking = (id) => api.get(`/api/bookings/${id}`)
export const getRefundInfo = (id) => api.get(`/api/bookings/${id}/refund-info`)
export const createBooking = (data) => api.post('/api/bookings', data)
export const cancelBooking = (id) => api.patch(`/api/bookings/${id}/cancel`)
export const processPayment = (id, data) => api.post(`/api/bookings/${id}/pay`, data)
export const verifyVnPayReturn = (params) => api.post('/api/payments/vnpay-return', params)
export const verifyMoMoReturn = (params) => api.post('/api/payments/momo-return', params)
export const verifyZaloPayReturn = (params) => api.post('/api/payments/zalopay-return', params)
export const verifyPayOSReturn = (params) => api.post('/api/payments/payos-return', params)

export const register = (data) => api.post('/api/auth/register', data)
export const login = (data) => api.post('/api/auth/login', data)
export const verifyEmail = (data) => api.post('/api/auth/verify-email', data)
export const getProfile = (email) => api.get('/api/auth/profile', { params: { email } })
export const updateProfile = (data) => api.put('/api/auth/profile', data)
export const createPriceAlert = (data) => api.post('/api/price-alerts', data)
export const getPriceAlerts = (email) => api.get('/api/price-alerts', { params: { email } })
export const deletePriceAlert = (id) => api.delete(`/api/price-alerts/${id}`)
export const togglePriceAlert = (id) => api.patch(`/api/price-alerts/${id}/toggle`)
export const checkPriceAlerts = (email) => api.post('/api/price-alerts/check', null, { params: { email } })
export const searchLocations = (q) => api.get('/api/locations/search', { params: { q } })
// Chat assistant
export const chatRecommend = (data) => api.post('/api/chat/recommend', data)
// Admin API
const adminHeaders = () => {
  try {
    const u = JSON.parse(sessionStorage.getItem('user'))
    return u?.email ? { 'X-Admin-Email': u.email } : {}
  } catch { return {} }
}

export const getAdminDashboard = () => api.get('/api/admin/dashboard', { headers: adminHeaders() })
export const getAdminUsers = (params) => api.get('/api/admin/users', { params, headers: adminHeaders() })
export const deleteAdminUser = (id) => api.delete(`/api/admin/users/${id}`, { headers: adminHeaders() })
export const getAdminBookings = (params) => api.get('/api/admin/bookings', { params, headers: adminHeaders() })
export const getAdminFlights = (params) => api.get('/api/admin/flights', { params, headers: adminHeaders() })
export const createAdminFlight = (data) => api.post('/api/admin/flights', data, { headers: adminHeaders() })
export const updateAdminFlight = (id, data) => api.put(`/api/admin/flights/${id}`, data, { headers: adminHeaders() })
export const deleteAdminFlight = (id) => api.delete(`/api/admin/flights/${id}`, { headers: adminHeaders() })
export const getAdminTrains = (params) => api.get('/api/admin/trains', { params, headers: adminHeaders() })
export const createAdminTrain = (data) => api.post('/api/admin/trains', data, { headers: adminHeaders() })
export const updateAdminTrain = (id, data) => api.put(`/api/admin/trains/${id}`, data, { headers: adminHeaders() })
export const deleteAdminTrain = (id) => api.delete(`/api/admin/trains/${id}`, { headers: adminHeaders() })

export const getAdminStats = (params) => api.get('/api/admin/stats', { params, headers: adminHeaders() })
export const importAdminFlights = (data) => api.post('/api/admin/flights/import', data, { headers: adminHeaders() })
export const exportAdminFlights = (params) => api.get('/api/admin/flights/export', { params, headers: adminHeaders(), responseType: 'blob' })
export const importAdminTrains = (data) => api.post('/api/admin/trains/import', data, { headers: adminHeaders() })
export const exportAdminTrains = () => api.get('/api/admin/trains/export', { headers: adminHeaders(), responseType: 'blob' })

// Reviews
export const getReviews = (params) => api.get('/api/reviews', { params })
export const getReviewSummary = (params) => api.get('/api/reviews/summary', { params })
export const createReview = (data) => api.post('/api/reviews', data)

// Community Tips
export const getCommunityTips = (params) => api.get('/api/community-tips', { params })
export const createCommunityTip = (data) => api.post('/api/community-tips', data)
export const upvoteTip = (id) => api.post(`/api/community-tips/${id}/upvote`)

// Promo Codes
export const getPublicPromoCodes = () => api.get('/api/promo-codes/public')
export const validatePromoCode = (data) => api.post('/api/promo-codes/validate', data)

// Lucky Wheel (Vòng quay may mắn)
export const getLuckyWheelStatus = (email) => api.get('/api/lucky-wheel/status', { params: { email } })
export const spinLuckyWheel = (data) => api.post('/api/lucky-wheel/spin', data)
export const getLuckyWheelHistory = (email) => api.get('/api/lucky-wheel/history', { params: { email } })

// Notifications
export const getNotifications = (params) => api.get('/api/notifications', { params })
export const getUnreadCount = (params) => api.get('/api/notifications/unread-count', { params })
export const markNotificationRead = (id) => api.patch(`/api/notifications/${id}/read`)
export const markAllNotificationsRead = (params) => api.patch('/api/notifications/read-all', null, { params })
export const deleteNotification = (id) => api.delete(`/api/notifications/${id}`)

// Carbon Footprint
export const getCarbonFootprint = (params) => api.get('/api/prices/carbon', { params })

// Calendar Export
export const getCalendarExport = (bookingId) => api.get(`/api/bookings/${bookingId}/calendar`, { responseType: 'blob' })

// Insurance
export const getInsurancePackages = () => api.get('/api/insurance/packages')
export const addBookingInsurance = (bookingId, data) => api.post(`/api/insurance/booking/${bookingId}`, data)
export const removeBookingInsurance = (bookingId) => api.delete(`/api/insurance/booking/${bookingId}`)

// Corporate
export const registerCorporate = (data) => api.post('/api/corporate/register', data)
export const getCorporateAccount = (id) => api.get(`/api/corporate/${id}`)
export const getCorporateEmployees = (id) => api.get(`/api/corporate/${id}/employees`)
export const addCorporateEmployee = (id, data) => api.post(`/api/corporate/${id}/employees`, data)
export const removeCorporateEmployee = (employeeId) => api.delete(`/api/corporate/employees/${employeeId}`)
export const approveCorporateBooking = (bookingId) => api.post(`/api/corporate/bookings/${bookingId}/approve`)
export const rejectCorporateBooking = (bookingId) => api.post(`/api/corporate/bookings/${bookingId}/reject`)
export const createInvoice = (corpId, data) => api.post(`/api/corporate/${corpId}/invoice`, data)
export const getCorporateInvoices = (corpId) => api.get(`/api/corporate/${corpId}/invoices`)

// Subscriptions
export const getSubscriptionPlans = () => api.get('/api/subscriptions/plans')
export const getUserSubscription = (userId) => api.get(`/api/subscriptions/user/${userId}`)
export const subscribeToPlan = (data) => api.post('/api/subscriptions/subscribe', data)
export const cancelSubscription = (userId) => api.post(`/api/subscriptions/cancel/${userId}`)

// Hotels
export const getHotels = (params) => api.get('/api/hotels/search', { params })
export const getHotel = (id) => api.get(`/api/hotels/${id}`)
export const bookHotel = (data) => api.post('/api/hotels/book', data)

export default api
