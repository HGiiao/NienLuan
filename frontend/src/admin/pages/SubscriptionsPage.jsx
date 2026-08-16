import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Crown, XCircle, RefreshCw, User, CalendarDays } from 'lucide-react'
import DataTable from '../DataTable'
import { useAdmin } from '../AdminContext'
import { getAdminSubscriptions, cancelSubscription } from '../../services/api'
import { formatCurrencyVnd } from '../../utils/formatters'

const planColors = {
  Free: 'bg-[var(--color-border)]/30 text-[var(--color-text-secondary)]',
  VIP: 'bg-primary-50 text-primary-600',
  Premium: 'bg-amber-500/10 text-amber-600',
}

const columns = [
  { key: 'user', label: 'Khách hàng', render: v => (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
        <span className="text-xs font-bold text-primary-600">{(v.user?.fullName || v.user?.email || '?')[0].toUpperCase()}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{v.user?.fullName || '—'}</p>
        <p className="text-[10px] text-[var(--color-text-tertiary)]">{v.user?.email || ''}</p>
      </div>
    </div>
  )},
  { key: 'plan', label: 'Gói', render: v => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${planColors[v.plan?.name] || 'bg-[var(--color-border)]/30 text-[var(--color-text-secondary)]'}`}>
      <Crown className="w-3 h-3" />{v.plan?.name}
    </span>
  )},
  { key: 'price', label: 'Giá', align: 'right', render: v => (
    <span className="text-sm text-[var(--color-text-secondary)]">{formatCurrencyVnd(v.plan?.monthlyPrice || 0)}{v.billingCycle === 'yearly' ? '/năm' : '/tháng'}</span>
  )},
  { key: 'billingCycle', label: 'Chu kỳ', render: v => (
    <span className="text-sm text-[var(--color-text-secondary)]">{v.billingCycle === 'yearly' ? 'Năm' : 'Tháng'}</span>
  )},
  { key: 'period', label: 'Hiệu lực', render: v => (
    <div className="flex items-center gap-1.5">
      <CalendarDays className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
      <span className="text-xs text-[var(--color-text-tertiary)] font-mono">{v.startDate?.split('T')[0]} → {v.endDate?.split('T')[0]}</span>
    </div>
  )},
  { key: 'status', label: 'Trạng thái', render: v => {
    const expired = v.status === 'active' && v.endDate && new Date(v.endDate) < new Date()
    const label = expired ? 'Hết hạn' : v.status === 'active' ? 'Đang hoạt động' : 'Đã hủy'
    const cls = expired
      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
      : v.status === 'active'
        ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20'
        : 'bg-[var(--color-border)]/30 text-[var(--color-text-tertiary)] border border-[var(--color-border)]'
    return <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-semibold ${cls}`}>{label}</span>
  }},
]

export default function SubscriptionsPage() {
  const { toast, confirmAction } = useAdmin()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = { page, search, pageSize: 10 }
    if (planFilter) params.plan = planFilter
    if (statusFilter) params.status = statusFilter
    getAdminSubscriptions(params)
      .then(res => {
        setData(res.data.items || res.data || [])
        setTotal(res.data.total || 0)
      })
      .catch(err => { console.error('[SubscriptionsPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Không thể tải danh sách gói VIP', 'error') })
      .finally(() => setLoading(false))
  }, [page, search, planFilter, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCancel = (row) => {
    confirmAction('Hủy gói VIP', `Bạn có chắc muốn hủy gói ${row.plan?.name} của ${row.user?.fullName || row.user?.email}? Khách sẽ quay về gói Free ngay lập tức.`, async () => {
      try {
        await cancelSubscription(row.userId)
        toast('Đã hủy gói VIP', 'success')
        fetchData()
      } catch (err) { console.error('[SubscriptionsPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Không thể hủy gói', 'error') }
    })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Quản lý gói VIP</h2>
        <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5">{total.toLocaleString('vi-VN')} đăng ký — Free 0đ • VIP 99.000đ/tháng • Premium 199.000đ/tháng</p>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        page={page}
        total={total}
        pageSize={10}
        onPageChange={setPage}
        onSearch={setSearch}
        searchValue={search}
        searchPlaceholder="Tìm tên, email khách..."
        filters={[
          { key: 'plan', label: 'Gói', type: 'select', value: planFilter, onChange: v => { setPlanFilter(v); setPage(1) }, options: [
            { label: 'Free', value: 'Free' },
            { label: 'VIP', value: 'VIP' },
            { label: 'Premium', value: 'Premium' },
          ]},
          { key: 'status', label: 'Trạng thái', type: 'select', value: statusFilter, onChange: v => { setStatusFilter(v); setPage(1) }, options: [
            { label: 'Đang hoạt động', value: 'active' },
            { label: 'Đã hủy', value: 'cancelled' },
          ]},
        ]}
        emptyIcon={Crown}
        emptyTitle="Chưa có đăng ký nào"
        emptyDesc="Khi khách mua gói VIP trên trang /vip, đăng ký sẽ xuất hiện ở đây."
        actions={(row) => (
          row.status === 'active'
            ? <button onClick={() => handleCancel(row)} className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors" title="Hủy gói"><XCircle className="w-3.5 h-3.5" /></button>
            : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold text-[var(--color-text-tertiary)]"><RefreshCw className="w-3 h-3" />Đã kết thúc</span>
        )}
      />
    </motion.div>
  )
}
