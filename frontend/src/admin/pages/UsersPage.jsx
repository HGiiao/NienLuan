import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Users, Trash2, Mail, Shield, Clock } from 'lucide-react'
import DataTable from '../DataTable'
import { useAdmin } from '../AdminContext'
import { getAdminUsers, deleteAdminUser } from '../../services/api'

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
          row.role !== 'admin' ? (
            <button onClick={() => handleDelete(row)} className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors" title="Xoá người dùng"><Trash2 className="w-3.5 h-3.5" /></button>
          ) : (
            <span className="inline-flex px-2 py-1 rounded-lg text-[10px] font-semibold bg-primary-50 text-primary-600 border border-primary-200">Admin</span>
          )
        )}
      />
    </motion.div>
  )
}
