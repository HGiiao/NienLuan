import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Train, Plus, Edit3, Trash2 } from 'lucide-react'
import DataTable from '../DataTable'
import ModalForm from '../ModalForm'
import { useAdmin } from '../AdminContext'
import { getAdminTrains, createAdminTrain, updateAdminTrain, deleteAdminTrain } from '../../services/api'

const columns = [
  { key: 'id', label: 'ID', render: v => <span className="text-xs font-mono text-[var(--color-text-tertiary)]">#{v.id}</span> },
  { key: 'trainCode', label: 'Mã tàu', render: v => (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center"><Train className="w-3.5 h-3.5 text-primary-500" /></div>
      <span className="text-sm font-semibold text-[var(--color-text-primary)]">{v.trainCode}</span>
    </div>
  )},
  { key: 'trainName', label: 'Tên tàu' },
  { key: 'departureLocation', label: 'Ga đi', render: v => <span className="text-sm text-[var(--color-text-secondary)]">{v.departureLocation}</span> },
  { key: 'arrivalLocation', label: 'Ga đến', render: v => <span className="text-sm text-[var(--color-text-secondary)]">{v.arrivalLocation}</span> },
  { key: 'departureTime', label: 'Giờ đi', render: v => <span className="text-sm text-[var(--color-text-tertiary)] font-mono">{v.departureTime?.split('T')[0]}</span> },
  { key: 'price', label: 'Giá', align: 'right', render: v => (
    <span className="text-sm font-semibold text-primary-600">{Number(v.price).toLocaleString('vi-VN')} ₫</span>
  )},
]

export default function TrainsPage() {
  const { toast, confirmAction } = useAdmin()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    trainCode: '', trainName: '', departureLocation: '', arrivalLocation: '',
    departureTime: '', arrivalTime: '', price: '', seats: '',
  })

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = { page, search, pageSize: 10 }
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    getAdminTrains(params)
      .then(res => {
        setData(res.data.items || res.data || [])
        setTotal(res.data.total || 0)
      })
      .catch(err => { console.error('[TrainsPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Không thể tải danh sách tàu hỏa', 'error') })
      .finally(() => setLoading(false))
  }, [page, search, dateFrom, dateTo])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    setForm({ trainCode: '', trainName: '', departureLocation: '', arrivalLocation: '', departureTime: '', arrivalTime: '', price: '', seats: '' })
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({
      trainCode: row.trainCode || '',
      trainName: row.trainName || '',
      departureLocation: row.departureLocation || '',
      arrivalLocation: row.arrivalLocation || '',
      departureTime: row.departureTime ? row.departureTime.slice(0, 16) : '',
      arrivalTime: row.arrivalTime ? row.arrivalTime.slice(0, 16) : '',
      price: row.price?.toString() || '',
      seats: row.seats?.toString() || '',
    })
    setModalOpen(true)
  }

  const handleDelete = (row) => {
    confirmAction('Xoá tàu hỏa', `Bạn có chắc muốn xoá tàu ${row.trainCode}?`, async () => {
      try {
        await deleteAdminTrain(row.id)
        toast('Đã xoá tàu hỏa', 'success')
        fetchData()
      } catch (err) { console.error('[TrainsPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Không thể xoá tàu hỏa', 'error') }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price), seats: parseInt(form.seats) }
      if (editing) {
        await updateAdminTrain(editing.id, payload)
        toast('Cập nhật tàu hỏa thành công', 'success')
      } else {
        await createAdminTrain(payload)
        toast('Tạo tàu hỏa thành công', 'success')
      }
      setModalOpen(false)
      fetchData()
    } catch (err) { console.error('[TrainsPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || (editing ? 'Không thể cập nhật' : 'Không thể tạo'), 'error') }
    finally { setSaving(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Quản lý tàu hỏa</h2>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5">{total.toLocaleString('vi-VN')} chuyến tàu</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-all shadow-sm">
          <Plus className="w-4 h-4" />
          Thêm tàu hỏa
        </button>
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
        searchPlaceholder="Tìm mã tàu, tên, ga..."
        filters={[
          { key: 'dateFrom', label: 'Từ ngày', type: 'date', value: dateFrom, onChange: v => { setDateFrom(v); setPage(1) } },
          { key: 'dateTo', label: 'Đến ngày', type: 'date', value: dateTo, onChange: v => { setDateTo(v); setPage(1) } },
        ]}
        emptyIcon={Train}
        emptyTitle="Không có tàu hỏa nào"
        emptyDesc="Thử thay đổi từ khoá tìm kiếm hoặc thêm tàu hỏa mới."
        actions={(row) => (
          <>
            <button onClick={() => openEdit(row)} className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-primary-500 hover:bg-primary-50 transition-colors" title="Sửa"><Edit3 className="w-3.5 h-3.5" /></button>
            <button onClick={() => handleDelete(row)} className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors" title="Xoá"><Trash2 className="w-3.5 h-3.5" /></button>
          </>
        )}
      />

      <ModalForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Sửa tàu hỏa' : 'Thêm tàu hỏa'}
        icon={Train}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel={editing ? 'Cập nhật' : 'Tạo tàu hỏa'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Mã tàu', key: 'trainCode', placeholder: 'SE1' },
            { label: 'Tên tàu', key: 'trainName', placeholder: 'Tàu Thống Nhất' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5">{f.label}</label>
              <input required value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all" />
            </div>
          ))}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5">Ga đi</label>
            <input required value={form.departureLocation} onChange={e => setForm(p => ({ ...p, departureLocation: e.target.value }))} placeholder="Hà Nội" className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5">Ga đến</label>
            <input required value={form.arrivalLocation} onChange={e => setForm(p => ({ ...p, arrivalLocation: e.target.value }))} placeholder="Sài Gòn" className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5">Giờ đi</label>
            <input type="datetime-local" required value={form.departureTime} onChange={e => setForm(p => ({ ...p, departureTime: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5">Giờ đến</label>
            <input type="datetime-local" required value={form.arrivalTime} onChange={e => setForm(p => ({ ...p, arrivalTime: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5">Giá (VND)</label>
            <input type="number" required value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="500000" className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5">Số ghế</label>
            <input type="number" required value={form.seats} onChange={e => setForm(p => ({ ...p, seats: e.target.value }))} placeholder="500" className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all" />
          </div>
        </div>
      </ModalForm>
    </motion.div>
  )
}
