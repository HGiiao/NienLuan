import { Link } from 'react-router-dom'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-8xl font-black text-[var(--color-text-tertiary)] mb-4">404</div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Không tìm thấy trang</h1>
        <p className="text-[var(--color-text-secondary)] mb-8">Trang bạn tìm kiếm không tồn tại hoặc đã bị di chuyển.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="flex items-center gap-2 bg-primary-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-600 transition-all">
            <Home className="w-4 h-4" /> Về trang chủ
          </Link>
          <Link to="/flights" className="flex items-center gap-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] px-5 py-2.5 rounded-xl font-semibold hover:bg-[var(--color-border)]/30 transition-all">
            <Search className="w-4 h-4" /> Tìm chuyến bay
          </Link>
        </div>
      </div>
    </div>
  )
}
