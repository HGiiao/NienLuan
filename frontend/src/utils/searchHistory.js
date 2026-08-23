const KEY = 've247-last-search'

// Lưu lần tra cứu gần nhất (từ trang chủ / trang tìm kiếm) để các trang
// So sánh (/compare) và Lộ trình (/optimal-route) điền sẵn, khách không phải nhập lại
export function saveLastSearch({ from, to, date, tripType, returnDate }) {
  if (!from || !to) return
  try {
    sessionStorage.setItem(KEY, JSON.stringify({
      from: String(from),
      to: String(to),
      date: date || '',
      tripType: tripType === 'round-trip' ? 'round-trip' : 'one-way',
      returnDate: tripType === 'round-trip' ? (returnDate || '') : '',
      savedAt: Date.now(),
    }))
  } catch { /* sessionStorage đầy hoặc bị chặn — bỏ qua */ }
}

export function getLastSearch() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (!s?.from || !s?.to) return null
    return {
      from: s.from,
      to: s.to,
      date: s.date || '',
      tripType: s.tripType === 'round-trip' ? 'round-trip' : 'one-way',
      returnDate: s.returnDate || '',
    }
  } catch { return null }
}
