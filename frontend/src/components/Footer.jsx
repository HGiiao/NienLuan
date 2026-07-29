import { Link } from 'react-router-dom'
import { Plane, Phone, Mail, MapPin, BarChart4 } from 'lucide-react'

const columns = [
  {
    title: 'Vé247', items: [
      { label: 'Về chúng tôi', to: '/' },
      { label: 'Cơ hội việc làm', to: '/' },
      { label: 'Điều khoản sử dụng', to: '/' },
      { label: 'Chính sách bảo mật', to: '/' },
    ],
  },
  {
    title: 'Hỗ trợ', items: [
      { label: 'Trung tâm hỗ trợ', to: '/' },
      { label: 'Câu hỏi thường gặp', to: '/optimal-route' },
      { label: 'Hướng dẫn đặt vé', to: '/flights' },
      { label: 'Liên hệ', to: '/' },
    ],
  },
  {
    title: 'Khám phá', items: [
      { label: 'Chuyến bay', to: '/flights' },
      { label: 'Tàu hỏa', to: '/trains' },
      { label: 'So sánh giá', to: '/compare' },
      { label: 'Lộ trình tối ưu', to: '/optimal-route' },
    ],
  },
]

const payments = ['Visa', 'MC', 'Momo', 'ZaloPay', 'VNPay']

export default function Footer() {
  return (
    <footer className="bg-[var(--color-bg-card)] border-t border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-sm">
                <BarChart4 className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-[var(--color-text-primary)]">
                Vé<span className="text-primary-500">247</span>
              </span>
            </Link>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">
              Nền tảng so sánh giá vé máy bay & tàu hỏa.<br />
              Dữ liệu tổng hợp từ 8+ nhà cung cấp.
            </p>
            <div className="flex items-center gap-2.5">
              <a href="tel:19006468" className="flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-600 transition-colors">
                <Phone className="w-4 h-4" />1900 6468
              </a>
            </div>
          </div>

          {columns.map((col, i) => (
            <div key={i}>
              <h3 className="font-semibold text-[var(--color-text-primary)] mb-3 text-sm">{col.title}</h3>
              <ul className="space-y-2">
                {col.items.map((item, j) => (
                  <li key={j}>
                    <Link to={item.to} className="text-sm text-[var(--color-text-secondary)] hover:text-primary-500 transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--color-text-tertiary)]">
            © 2026 Vé247. Tất cả quyền được bảo lưu.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-text-tertiary)]">Thanh toán qua</span>
            <div className="flex items-center gap-2">
              {payments.map((p, i) => (
                <span key={i} className="text-[11px] font-semibold text-[var(--color-text-tertiary)] bg-[var(--color-border)] px-2.5 py-1 rounded-lg">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
