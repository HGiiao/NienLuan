import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Bus, Plus, Edit3, Trash2, Upload, Download } from 'lucide-react'
import DataTable from '../DataTable'
import ModalForm from '../ModalForm'
import LocationSelect from '../LocationSelect'
import { useAdmin } from '../AdminContext'
import { getAdminBuses, createAdminBus, updateAdminBus, deleteAdminBus, importAdminBuses, exportAdminBuses } from '../../services/api'

const coachOptions = ['Giường nằm', 'Ghế ngồi', 'Limousine', 'VIP']
const companyOptions = [
  { code: 'ML', name: 'Mai Linh' },
  { code: 'KH', name: 'Kumho Samco' },
  { code: 'HA', name: 'Hải Âu' },
  { code: 'SV', name: 'Sao Việt' },
  { code: 'PT', name: 'Phương Trang' },
]

const busPointOptions = [
  'Bến xe Giáp Bát', 'Bến xe Mỹ Đình', 'Bến xe Nước Ngầm', 'Bến xe Lương Yên', 'Bến xe Gia Lâm',
  'Bến xe Miền Đông', 'Bến xe Miền Tây', 'Bến xe An Sương',
  'Bến xe Trung tâm Đà Nẵng', 'Bến xe Trung tâm Nha Trang', 'Bến xe Phú Bài', 'Bến xe Vinh',
]

const coachLabels = {
  'Giường nằm': 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
  'Ghế ngồi': 'bg-primary-50 text-primary-600',
  'Limousine': 'bg-amber-500/10 text-amber-600',
  'VIP': 'bg-violet-500/10 text-violet-600',
}

const columns = [
  { key: 'id', label: 'ID', render: v => <span className="text-xs font-mono text-[var(--color-text-tertiary)]">#{v.id}</span> },
  { key: 'busCode', label: 'Mã xe', render: v => (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center"><Bus className="w-3.5 h-3.5 text-primary-500" /></div>
      <span className="text-sm font-semibold text-[var(--color-text-primary)]">{v.busCode}</span>
    </div>
  )},
  { key: 'busCompany', label: 'Nhà xe' },
  { key: 'coachClass', label: 'Hạng xe', render: v => (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ${coachLabels[v.coachClass] || 'bg-[var(--color-border)]/30 text-[var(--color-text-secondary)]'}`}>{v.coachClass || '—'}</span>
  )},
  { key: 'route', label: 'Tuyến', render: v => <span className="text-sm text-[var(--color-text-secondary)]">{v.departureLocation} → {v.arrivalLocation}</span> },
  { key: 'departureTime', label: 'Ngày khởi hành', render: v => <span className="text-sm text-[var(--color-text-tertiary)] font-mono">{v.departureTime?.split('T')[0]}</span> },
  { key: 'seats', label: 'Số ghế', align: 'right', render: v => <span className="text-sm text-[var(--color-text-secondary)]">{v.seats}</span> },
  { key: 'price', label: 'Giá', align: 'right', render: v => (
    <span className="text-sm font-semibold text-primary-600">{Number(v.price).toLocaleString('vi-VN')} ₫</span>
  )},
]

export default function BusesPage() {
  const { toast, confirmAction } = useAdmin()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [companyFilter, setCompanyFilter] = useState('')
  const fileInputRef = useRef(null)
  const [importing, setImporting] = useState(false)

  const [form, setForm] = useState({
    busCode: '', busCompany: '', departureLocation: '', arrivalLocation: '',
    departureTime: '', arrivalTime: '', price: '', seats: '', coachClass: 'Giường nằm',
    pickupPoint: '', dropoffPoint: '',
  })

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = { page, search, pageSize: 10 }
    if (companyFilter) params.company = companyFilter
    getAdminBuses(params)
      .then(res => {
        setData(res.data.items || res.data || [])
        setTotal(res.data.total || 0)
      })
      .catch(err => { console.error('[BusesPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Không thể tải danh sách xe khách', 'error') })
      .finally(() => setLoading(false))
  }, [page, search, companyFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    setForm({ busCode: '', busCompany: '', departureLocation: '', arrivalLocation: '', departureTime: '', arrivalTime: '', price: '', seats: '', coachClass: 'Giường nằm', pickupPoint: '', dropoffPoint: '' })
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({
      busCode: row.busCode || '',
      busCompany: row.busCompany || '',
      departureLocation: row.departureLocation || '',
      arrivalLocation: row.arrivalLocation || '',
      departureTime: row.departureTime ? row.departureTime.slice(0, 16) : '',
      arrivalTime: row.arrivalTime ? row.arrivalTime.slice(0, 16) : '',
      price: row.price?.toString() || '',
      seats: row.seats?.toString() || '',
      coachClass: row.coachClass || 'Giường nằm',
      pickupPoint: row.pickupPoint || '',
      dropoffPoint: row.dropoffPoint || '',
    })
    setModalOpen(true)
  }

  const handleDelete = (row) => {
    confirmAction('Xoá chuyến xe', `Bạn có chắc muốn xoá chuyến ${row.busCode} (${row.busCompany})?`, async () => {
      try {
        await deleteAdminBus(row.id)
        toast('Đã xoá chuyến xe', 'success')
        fetchData()
      } catch (err) { console.error('[BusesPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Không thể xoá chuyến xe', 'error') }
    })
  }

  const handleCompanyChange = (name) => {
    const company = companyOptions.find(c => c.name === name)
    setForm(p => ({ ...p, busCompany: name, busCode: p.busCode || (company ? company.code : '') }))
  }

  const generateBusCode = () => {
    const prefix = companyOptions.find(c => c.name === form.busCompany)?.code || 'XE'
    let code = ''
    for (let i = 0; i < 20; i++) {
      code = `${prefix}${String(Math.floor(100 + Math.random() * 900))}`
      if (!data.some(r => r.id !== editing?.id && r.busCode === code)) break
    }
    setForm(p => ({ ...p, busCode: code }))
  }

  const codeDuplicate = !!form.busCode && data.some(r => r.id !== editing?.id && r.busCode === form.busCode.trim())

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (codeDuplicate) { toast(`Mã chuyến xe "${form.busCode}" đã tồn tại`, 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price), seats: parseInt(form.seats) }
      if (editing) {
        await updateAdminBus(editing.id, payload)
        toast('Cập nhật chuyến xe thành công', 'success')
      } else {
        await createAdminBus(payload)
        toast('Tạo chuyến xe thành công', 'success')
      }
      setModalOpen(false)
      fetchData()
    } catch (err) { console.error('[BusesPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || (editing ? 'Không thể cập nhật' : 'Không thể tạo'), 'error') }
    finally { setSaving(false) }
  }

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
  const labelCls = "block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5"

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Quản lý xe khách</h2>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5">{total.toLocaleString('vi-VN')} chuyến xe</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return
            setImporting(true)
            try {
              const text = await file.text(); const data = JSON.parse(text)
              const list = Array.isArray(data) ? data : data.items || data.buses || []
              if (list.length === 0) { toast('File không có dữ liệu', 'error'); return }
              const res = await importAdminBuses(list)
              toast(res.data?.message || `Đã nhập ${list.length} chuyến xe`, 'success')
              fetchData()
            } catch (err) { toast(err.response?.data?.message || 'Lỗi import file', 'error') }
            finally { setImporting(false); e.target.value = '' }
          }} />
          <button disabled={importing} onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]/30 transition-all disabled:opacity-50">
            <Upload className="w-4 h-4" />{importing ? 'Đang nhập...' : 'Import'}
          </button>
          <button onClick={async () => {
            try {
              const res = await exportAdminBuses({})
              const url = URL.createObjectURL(new Blob([res.data]))
              const a = document.createElement('a'); a.href = url; a.download = `buses_${new Date().toISOString().split('T')[0]}.csv`
              a.click(); URL.revokeObjectURL(url)
              toast('Xuất file CSV thành công', 'success')
            } catch (err) { toast('Lỗi xuất file', 'error') }
          }} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]/30 transition-all">
            <Download className="w-4 h-4" />Export
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-all shadow-sm">
            <Plus className="w-4 h-4" />
            Thêm chuyến xe
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
        searchPlaceholder="Tìm mã xe, nhà xe, tuyến..."
        filters={[
          { key: 'company', label: 'Nhà xe', type: 'select', value: companyFilter, onChange: v => { setCompanyFilter(v); setPage(1) }, options: companyOptions.map(c => ({ label: c.name, value: c.name })) },
        ]}
        emptyIcon={Bus}
        emptyTitle="Không có chuyến xe nào"
        emptyDesc="Thử thay đổi từ khoá tìm kiếm hoặc thêm chuyến xe mới."
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
        title={editing ? 'Sửa chuyến xe' : 'Thêm chuyến xe'}
        icon={Bus}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel={editing ? 'Cập nhật' : 'Tạo chuyến xe'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Mã chuyến xe</label>
            <div className="flex gap-2">
              <input required value={form.busCode} onChange={e => setForm(p => ({ ...p, busCode: e.target.value }))} placeholder="ML001" className={`${inputCls} flex-1`} />
              <button type="button" onClick={generateBusCode} className="px-3 rounded-xl text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-all whitespace-nowrap">Tự sinh</button>
            </div>
            {codeDuplicate && <p className="mt-1.5 text-[11px] font-medium text-[var(--color-danger)]">Mã này đã tồn tại, vui lòng đổi mã.</p>}
          </div>
          <div>
            <label className={labelCls}>Nhà xe</label>
            <select required value={form.busCompany} onChange={e => handleCompanyChange(e.target.value)} className={inputCls}>
              <option value="">Chọn nhà xe</option>
              {companyOptions.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <LocationSelect label="Đi" value={form.departureLocation} onChange={v => setForm(p => ({ ...p, departureLocation: v }))} placeholder="Chọn điểm đi" />
          <LocationSelect label="Đến" value={form.arrivalLocation} onChange={v => setForm(p => ({ ...p, arrivalLocation: v }))} placeholder="Chọn điểm đến" />
          <div>
            <label className={labelCls}>Giờ đi</label>
            <input type="datetime-local" required value={form.departureTime} onChange={e => setForm(p => ({ ...p, departureTime: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Giờ đến</label>
            <input type="datetime-local" required value={form.arrivalTime} onChange={e => setForm(p => ({ ...p, arrivalTime: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Hạng xe</label>
            <select required value={form.coachClass} onChange={e => setForm(p => ({ ...p, coachClass: e.target.value }))} className={inputCls}>
              {coachOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Số ghế</label>
            <input type="number" required value={form.seats} onChange={e => setForm(p => ({ ...p, seats: e.target.value }))} placeholder="40" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Giá (VND)</label>
            <input type="number" required value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="500000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Điểm đón</label>
            <select value={form.pickupPoint} onChange={e => setForm(p => ({ ...p, pickupPoint: e.target.value }))} className={inputCls}>
              <option value="">Chọn điểm đón</option>
              {busPointOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Điểm trả</label>
            <select value={form.dropoffPoint} onChange={e => setForm(p => ({ ...p, dropoffPoint: e.target.value }))} className={inputCls}>
              <option value="">Chọn điểm trả</option>
              {busPointOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </ModalForm>
    </motion.div>
  )
}
