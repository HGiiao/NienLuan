import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Ticket, Eye, XCircle, CheckCircle, DollarSign, ExternalLink } from 'lucide-react'
import DataTable from '../DataTable'
import { useAdmin } from '../AdminContext'
import { getAdminBookings, cancelBooking, processPayment } from '../../services/api'

const statusPills = {
  Confirmed: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20',
  Pending: 'bg-primary-50 text-primary-600 border-primary-200',
  Cancelled: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20',
}

const statusLabels = {
  Confirmed: 'Đã xác nhận',
  Pending: 'Chờ xử lý',
  Cancelled: 'Đã huỷ',
}

const columns = [
  { key: 'id', label: 'Mã ĐC', render: v => <span className="text-xs font-mono text-[var(--color-text-tertiary)]">#{v.id}</span> },
  { key: 'user', label: 'Khách hàng', render: v => (
    <div>
      <p className="text-sm font-medium text-[var(--color-text-primary)]">{v.user?.fullName || '—'}</p>
      <p className="text-[10px] text-[var(--color-text-tertiary)]">{v.user?.email || ''}</p>
    </div>
  )},
  { key: 'type', label: 'Loại', render: v => (
    <span className="inline-flex px-2 py-1 rounded-md text-[11px] font-medium bg-[var(--color-bg)] text-[var(--color-text-secondary)]">{v.flightId ? 'Chuyến bay' : v.trainId ? 'Tàu hỏa' : '—'}</span>
  )},
  { key: 'status', label: 'Trạng thái', render: v => (
    <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${statusPills[v.status] || statusPills.Pending}`}>
      {statusLabels[v.status] || v.status}
    </span>
  )},
  { key: 'totalPrice', label: 'Tổng tiền', align: 'right', render: v => (
    <span className="text-sm font-semibold text-primary-600">{Number(v.totalPrice).toLocaleString('vi-VN')} ₫</span>
  )},
  { key: 'bookingDate', label: 'Ngày đặt', render: v => (
    <span className="text-xs text-[var(--color-text-tertiary)] font-mono">{v.bookingDate?.split('T')[0]}</span>
  )},
]

export default function BookingsPage() {
  const { toast, confirmAction } = useAdmin()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = { page, search, pageSize: 10 }
    if (statusFilter) params.status = statusFilter
    getAdminBookings(params)
      .then(res => {
        setData(res.data.items || res.data || [])
        setTotal(res.data.total || 0)
      })
      .catch(err => { console.error('[BookingsPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Không thể tải danh sách đặt chỗ', 'error') })
      .finally(() => setLoading(false))
  }, [page, search, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCancel = (row) => {
    confirmAction('Huỷ đặt chỗ', `Bạn có chắc muốn huỷ đặt chỗ #${row.id} của ${row.user?.fullName}?`, async () => {
      try {
        await cancelBooking(row.id)
        toast('Đã huỷ đặt chỗ', 'success')
        fetchData()
      } catch (err) { console.error('[BookingsPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Không thể huỷ đặt chỗ', 'error') }
    })
  }

  const handleConfirm = (row) => {
    confirmAction('Xác nhận thanh toán', `Xác nhận thanh toán cho đặt chỗ #${row.id}? (Sandbox)`, async () => {
      try {
        await processPayment(row.id)
        toast('Xác nhận thanh toán thành công', 'success')
        fetchData()
      } catch (err) { console.error('[BookingsPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Xác nhận thanh toán thất bại', 'error') }
    })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Quản lý đặt chỗ</h2>
        <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5">{total.toLocaleString('vi-VN')} đặt chỗ</p>
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
        searchPlaceholder="Tìm mã đặt chỗ, tên khách, email..."
        filters={[
          { key: 'status', label: 'Trạng thái', type: 'select', value: statusFilter, onChange: v => { setStatusFilter(v); setPage(1) }, options: [
            { label: 'Đã xác nhận', value: 'Confirmed' },
            { label: 'Chờ xử lý', value: 'Pending' },
            { label: 'Đã huỷ', value: 'Cancelled' },
          ]},
        ]}
        emptyIcon={Ticket}
        emptyTitle="Không có đặt chỗ nào"
        emptyDesc="Chưa có giao dịch nào được thực hiện."
        onRowClick={setSelected}
        actions={(row) => (
          <>
            {row.status === 'Pending' && (
              <button onClick={() => handleConfirm(row)} className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-primary-500 hover:bg-primary-50 transition-colors" title="Xác nhận thanh toán">
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
            )}
            {(row.status === 'Pending' || row.status === 'Confirmed') && (
              <button onClick={() => handleCancel(row)} className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors" title="Huỷ đặt chỗ">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      />

      {selected && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Chi tiết đặt chỗ #{selected.id}</h3>
            <button onClick={() => setSelected(null)} className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">Đóng</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div><span className="text-[var(--color-text-tertiary)] block text-xs">Khách hàng</span><span className="text-[var(--color-text-primary)]">{selected.user?.fullName || '—'}</span></div>
            <div><span className="text-[var(--color-text-tertiary)] block text-xs">Email</span><span className="text-[var(--color-text-primary)]">{selected.user?.email || '—'}</span></div>
            <div><span className="text-[var(--color-text-tertiary)] block text-xs">SĐT</span><span className="text-[var(--color-text-primary)]">{selected.user?.phone || '—'}</span></div>
            <div><span className="text-[var(--color-text-tertiary)] block text-xs">Trạng thái</span><span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${statusPills[selected.status] || statusPills.Pending}`}>{statusLabels[selected.status] || selected.status}</span></div>
            <div><span className="text-[var(--color-text-tertiary)] block text-xs">Phương thức thanh toán</span><span className="text-[var(--color-text-primary)]">{selected.paymentMethod || '—'}</span></div>
            <div><span className="text-[var(--color-text-tertiary)] block text-xs">Tổng tiền</span><span className="text-primary-600 font-semibold">{Number(selected.totalPrice).toLocaleString('vi-VN')} ₫</span></div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
