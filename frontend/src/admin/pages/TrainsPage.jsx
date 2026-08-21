import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Train, Plus, Edit3, Trash2, Upload, Download } from 'lucide-react'
import DataTable from '../DataTable'
import ModalForm from '../ModalForm'
import LocationSelect from '../LocationSelect'
import { useAdmin } from '../AdminContext'
import { getAdminTrains, createAdminTrain, updateAdminTrain, deleteAdminTrain, importAdminTrains, exportAdminTrains } from '../../services/api'

const coachClassOptions = [
  { value: 'Soft Sleeper', label: 'Giường mềm (Soft Sleeper)' },
  { value: 'Hard Sleeper', label: 'Giường cứng (Hard Sleeper)' },
  { value: 'Soft Seat', label: 'Ghế mềm (Soft Seat)' },
  { value: 'Seat', label: 'Ghế cứng (Seat)' },
]

const trainTypeOptions = [
  { value: 'Reunification Express', label: 'Reunification Express' },
  { value: 'Fast Train', label: 'Fast Train' },
  { value: 'Local Train', label: 'Local Train' },
]

const columns = [
  { key: 'id', label: 'ID', render: v => <span className="text-xs font-mono text-[var(--color-text-tertiary)]">#{v.id}</span> },
  { key: 'trainCode', label: 'Mã tàu', render: v => (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center"><Train className="w-3.5 h-3.5 text-primary-500" /></div>
      <span className="text-sm font-semibold text-[var(--color-text-primary)]">{v.trainCode}</span>
    </div>
  )},
  { key: 'trainName', label: 'Loại tàu' },
  { key: 'coachClass', label: 'Hạng', render: v => <span className="text-xs px-2 py-0.5 rounded-md bg-primary-50 text-primary-600">{v.coachClass || '—'}</span> },
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
    departureTime: '', arrivalTime: '', price: '', seats: '', coachClass: 'Soft Seat',
  })

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const fileInputRef = useRef(null)
  const [importing, setImporting] = useState(false)

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
    setForm({ trainCode: '', trainName: '', departureLocation: '', arrivalLocation: '', departureTime: '', arrivalTime: '', price: '', seats: '', coachClass: 'Soft Seat' })
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
      coachClass: row.coachClass || 'Soft Seat',
    })
    setModalOpen(true)
  }

  const trainTypeByPrefix = { SE: 'Reunification Express', TN: 'Fast Train', LP: 'Local Train' }

  const generateTrainCode = () => {
    const prefixes = ['SE', 'TN', 'LP']
    let code = ''
    for (let i = 0; i < 20; i++) {
      code = `${prefixes[Math.floor(Math.random() * prefixes.length)]}${Math.floor(1 + Math.random() * 99)}`
      if (!data.some(r => r.id !== editing?.id && r.trainCode === code)) break
    }
    setForm(p => ({
      ...p,
      trainCode: code,
      trainName: p.trainName || trainTypeByPrefix[code.replace(/\d/g, '')] || 'Local Train',
    }))
  }

  const codeDuplicate = !!form.trainCode && data.some(r => r.id !== editing?.id && r.trainCode === form.trainCode.trim())

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
    const codeDuplicate = data.some(r => r.id !== editing?.id && r.trainCode === form.trainCode.trim())
    if (codeDuplicate) { toast(`Mã tàu "${form.trainCode}" đã tồn tại`, 'error'); return }
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
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return
            setImporting(true)
            try {
              const text = await file.text(); const data = JSON.parse(text)
              const list = Array.isArray(data) ? data : data.items || data.trains || []
              if (list.length === 0) { toast('File không có dữ liệu', 'error'); return }
              const res = await importAdminTrains(list)
              toast(res.data?.message || `Đã nhập ${list.length} chuyến tàu`, 'success')
              fetchData()
            } catch (err) { toast(err.response?.data?.message || 'Lỗi import file', 'error') }
            finally { setImporting(false); e.target.value = '' }
          }} />
          <button disabled={importing} onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]/30 transition-all disabled:opacity-50">
            <Upload className="w-4 h-4" />{importing ? 'Đang nhập...' : 'Import'}
          </button>
          <button onClick={async () => {
            try {
              const res = await exportAdminTrains()
              const url = URL.createObjectURL(new Blob([res.data]))
              const a = document.createElement('a'); a.href = url; a.download = `trains_${new Date().toISOString().split('T')[0]}.csv`
              a.click(); URL.revokeObjectURL(url)
              toast('Xuất file CSV thành công', 'success')
            } catch (err) { toast('Lỗi xuất file', 'error') }
          }} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]/30 transition-all">
            <Download className="w-4 h-4" />Export
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-all shadow-sm">
            <Plus className="w-4 h-4" />
            Thêm tàu hỏa
          </button>
        </div>
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
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5">Mã tàu</label>
            <div className="flex gap-2">
              <input required value={form.trainCode} onChange={e => setForm(p => ({ ...p, trainCode: e.target.value }))} placeholder="SE25" className="flex-1 w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all" />
              <button type="button" onClick={generateTrainCode} className="px-3 py-2.5 rounded-xl text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-all whitespace-nowrap">Tự sinh</button>
            </div>
            {codeDuplicate && <p className="mt-1.5 text-[11px] font-medium text-[var(--color-danger)]">Mã này đã tồn tại, vui lòng đổi mã.</p>}
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5">Loại tàu</label>
            <select required value={form.trainName} onChange={e => setForm(p => ({ ...p, trainName: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all">
              <option value="">Chọn loại tàu</option>
              {trainTypeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <LocationSelect label="Ga đi" value={form.departureLocation} onChange={v => setForm(p => ({ ...p, departureLocation: v }))} placeholder="Chọn ga đi" />
          <LocationSelect label="Ga đến" value={form.arrivalLocation} onChange={v => setForm(p => ({ ...p, arrivalLocation: v }))} placeholder="Chọn ga đến" />
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
            <label className="block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5">Hạng ghế</label>
            <select required value={form.coachClass} onChange={e => setForm(p => ({ ...p, coachClass: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all">
              {coachClassOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
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
