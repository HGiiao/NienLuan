import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Users, Trash2, Mail, Shield, Clock, Eye, Ticket, Crown, Bell, Gift, X } from 'lucide-react'
import DataTable from '../DataTable'
import { useAdmin } from '../AdminContext'
import { getAdminUsers, deleteAdminUser, getUserOverview } from '../../services/api'
import { formatCurrencyVnd } from '../../utils/formatters'

const statusPills = {
  Confirmed: 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20',
  Pending: 'bg-primary-50 text-primary-600 border-primary-200',
  Cancelled: 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20',
}

const statusLabels = { Confirmed: 'Đã xác nhận', Pending: 'Chờ xử lý', Cancelled: 'Đã huỷ' }

const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('vi-VN') : '—'
const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—'

const columns = [
  { key: 'id', label: 'ID', render: v => <span className="text-xs font-mono text-[var(--color-text-tertiary)]">#{v.id}</span> },
  { key: 'fullName', label: 'Tên', render: v => (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center">
        <span className="text-xs font-bold text-primary-600">
          {(v.fullName || v.email || '?')[0].toUpperCase()}
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{v.fullName || '—'}</p>
        <p className="text-[10px] text-[var(--color-text-tertiary)]">{v.role || 'user'}</p>
      </div>
    </div>
  )},
  { key: 'email', label: 'Email', render: v => (
    <div className="flex items-center gap-2">
      <Mail className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
      <span className="text-sm text-[var(--color-text-secondary)]">{v.email}</span>
    </div>
  )},
  { key: 'phone', label: 'SĐT', render: v => <span className="text-sm text-[var(--color-text-tertiary)]">{v.phone || '—'}</span> },
  { key: 'isEmailVerified', label: 'Xác thực', render: v => (
    v.isEmailVerified
      ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20"><Shield className="w-3 h-3" />Đã xác thực</span>
      : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-primary-50 text-primary-600 border border-primary-200"><Clock className="w-3 h-3" />Chờ</span>
  )},
  { key: 'createdAt', label: 'Ngày tạo', render: v => (
    <span className="text-xs text-[var(--color-text-tertiary)] font-mono">{v.createdAt?.split('T')[0]}</span>
  )},
]

export default function UsersPage() {
  const { toast, confirmAction } = useAdmin()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [roleFilter, setRoleFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const openDetail = (row) => {
    setSelected(null)
    setDetailLoading(true)
    getUserOverview(row.id)
      .then(res => setSelected(res.data))
      .catch(err => { console.error('[UsersPage] Detail error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Không thể tải chi tiết người dùng', 'error') })
      .finally(() => setDetailLoading(false))
  }

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = { page, search, pageSize: 10 }
    if (roleFilter) params.role = roleFilter
    getAdminUsers(params)
      .then(res => {
        setData(res.data.items || res.data || [])
        setTotal(res.data.total || 0)
      })
      .catch(err => { console.error('[UsersPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Không thể tải danh sách người dùng', 'error') })
      .finally(() => setLoading(false))
  }, [page, search, roleFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = (row) => {
    confirmAction('Xoá người dùng', `Bạn có chắc muốn xoá người dùng ${row.email}? Hành động này không thể hoàn tác.`, async () => {
      try {
        await deleteAdminUser(row.id)
        toast('Đã xoá người dùng', 'success')
        fetchData()
      } catch (err) { console.error('[UsersPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Không thể xoá người dùng', 'error') }
    })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Quản lý người dùng</h2>
        <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5">{total.toLocaleString('vi-VN')} người dùng</p>
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
        searchPlaceholder="Tìm tên, email..."
        filters={[
          { key: 'role', label: 'Vai trò', type: 'select', value: roleFilter, onChange: v => { setRoleFilter(v); setPage(1) }, options: [
            { label: 'Admin', value: 'Admin' },
            { label: 'User', value: 'User' },
          ]},
        ]}
        emptyIcon={Users}
        emptyTitle="Không có người dùng nào"
        emptyDesc="Chưa có người dùng nào đăng ký."
        actions={(row) => (
          <>
            <button onClick={() => openDetail(row)} className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-primary-500 hover:bg-primary-50 transition-colors" title="Xem chi tiết"><Eye className="w-3.5 h-3.5" /></button>
            {row.role !== 'admin' ? (
              <button onClick={() => handleDelete(row)} className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors" title="Xoá người dùng"><Trash2 className="w-3.5 h-3.5" /></button>
            ) : (
              <span className="inline-flex px-2 py-1 rounded-lg text-[10px] font-semibold bg-primary-50 text-primary-600 border border-primary-200">Admin</span>
            )}
          </>
        )}
      />

      {detailLoading && (
        <div className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-6 animate-pulse">
          <div className="h-5 w-1/3 bg-[var(--color-border)]/50 rounded mb-4" />
          <div className="h-16 bg-[var(--color-border)]/30 rounded mb-3" />
          <div className="h-16 bg-[var(--color-border)]/30 rounded" />
        </div>
      )}

      {selected && !detailLoading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Chi tiết người dùng</h3>
            <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]/30 transition-colors"><X className="w-4 h-4" /></button>
          </div>

          {/* Thông tin cơ bản */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center">
              <span className="text-base font-bold text-primary-600">{(selected.user?.fullName || selected.user?.email || '?')[0].toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-[var(--color-text-primary)]">{selected.user?.fullName || '—'}</p>
              <p className="text-xs text-[var(--color-text-tertiary)]">{selected.user?.email} • {selected.user?.phone || 'chưa có SĐT'}</p>
            </div>
            <div className="ml-auto flex flex-wrap gap-2 text-[10px] font-semibold">
              <span className={`px-2.5 py-1 rounded-lg border ${selected.user?.role === 'Admin' ? 'bg-primary-50 text-primary-600 border-primary-200' : 'bg-[var(--color-border)]/30 text-[var(--color-text-tertiary)] border-[var(--color-border)]'}`}>{selected.user?.role || 'User'}</span>
              <span className={`px-2.5 py-1 rounded-lg border ${selected.user?.isEmailVerified ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>{selected.user?.isEmailVerified ? 'Đã xác thực email' : 'Chưa xác thực'}</span>
              <span className="px-2.5 py-1 rounded-lg bg-[var(--color-border)]/30 text-[var(--color-text-tertiary)] border border-[var(--color-border)]">Tham gia {fmtDate(selected.user?.createdAt)}</span>
            </div>
          </div>

          {/* Thống kê nhanh */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <div className="flex items-center gap-2 mb-1"><Crown className="w-4 h-4 text-amber-500" /><p className="text-[10px] font-semibold text-[var(--color-text-tertiary)]">Gói VIP</p></div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">{selected.subscription?.plan || 'Free'}</p>
              {selected.subscription && <p className="text-[10px] text-[var(--color-text-tertiary)]">Hết hạn {fmtDate(selected.subscription.endDate)}</p>}
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <div className="flex items-center gap-2 mb-1"><Ticket className="w-4 h-4 text-primary-500" /><p className="text-[10px] font-semibold text-[var(--color-text-tertiary)]">Đặt chỗ</p></div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">{selected.bookings?.length || 0}</p>
              <p className="text-[10px] text-[var(--color-text-tertiary)]">{formatCurrencyVnd((selected.bookings || []).reduce((s, b) => s + Number(b.totalPrice || 0), 0))} tổng</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <div className="flex items-center gap-2 mb-1"><Bell className="w-4 h-4 text-sky-500" /><p className="text-[10px] font-semibold text-[var(--color-text-tertiary)]">Cảnh báo giá</p></div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">{selected.alerts?.length || 0}</p>
              <p className="text-[10px] text-[var(--color-text-tertiary)]">{(selected.alerts || []).filter(a => a.isActive).length} đang bật</p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <div className="flex items-center gap-2 mb-1"><Gift className="w-4 h-4 text-emerald-500" /><p className="text-[10px] font-semibold text-[var(--color-text-tertiary)]">Vòng quay</p></div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">{selected.spins?.length || 0} lượt</p>
              <p className="text-[10px] text-[var(--color-text-tertiary)]">{(selected.spins || []).filter(s => s.won).length} lần trúng</p>
            </div>
          </div>

          {/* Đặt chỗ */}
          <div className="mb-5">
            <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wide mb-2">Đặt chỗ gần đây</h4>
            {!selected.bookings?.length ? (
              <p className="text-xs text-[var(--color-text-tertiary)]">Chưa có đặt chỗ nào.</p>
            ) : (
              <div className="space-y-1.5">
                {selected.bookings.slice(0, 8).map(b => (
                  <div key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
                    <span className="text-xs font-mono text-[var(--color-text-tertiary)]">#{b.id}</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">{b.type} • {fmtDateTime(b.bookingDate)}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${statusPills[b.status] || statusPills.Pending}`}>{statusLabels[b.status] || b.status}</span>
                    <span className="text-xs font-bold text-primary-600">{formatCurrencyVnd(b.totalPrice)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Cảnh báo giá */}
            <div>
              <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wide mb-2">Cảnh báo giá</h4>
              {!selected.alerts?.length ? (
                <p className="text-xs text-[var(--color-text-tertiary)]">Chưa có cảnh báo nào.</p>
              ) : (
                <div className="space-y-1.5">
                  {selected.alerts.slice(0, 6).map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
                      <span className="text-xs font-semibold text-[var(--color-text-primary)]">{a.routeFrom} → {a.routeTo}</span>
                      <span className="text-xs text-[var(--color-text-tertiary)]">mục tiêu {formatCurrencyVnd(a.targetPrice)}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${a.isActive ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]' : 'bg-[var(--color-border)]/30 text-[var(--color-text-tertiary)]'}`}>{a.isActive ? 'Bật' : 'Tắt'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vòng quay + thông báo */}
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wide mb-2">Lịch sử vòng quay</h4>
                {!selected.spins?.length ? (
                  <p className="text-xs text-[var(--color-text-tertiary)]">Chưa quay lần nào.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selected.spins.slice(0, 5).map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
                        <span className="text-xs text-[var(--color-text-secondary)]">{fmtDateTime(s.createdAt)}</span>
                        {s.won && s.code
                          ? <span className="text-xs font-bold text-primary-600 font-mono">Trúng {s.code}</span>
                          : <span className="text-xs text-[var(--color-text-tertiary)]">Chưa trúng</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wide mb-2">Thông báo gần đây</h4>
                {!selected.notifications?.length ? (
                  <p className="text-xs text-[var(--color-text-tertiary)]">Chưa có thông báo.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selected.notifications.slice(0, 5).map(n => (
                      <div key={n.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
                        <span className="text-xs text-[var(--color-text-secondary)] truncate">{n.title}</span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)] shrink-0">{fmtDate(n.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
