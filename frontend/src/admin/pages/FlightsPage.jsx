import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Plane, Plus, Edit3, Trash2, Upload, Download } from 'lucide-react'
import DataTable from '../DataTable'
import ModalForm from '../ModalForm'
import LocationSelect from '../LocationSelect'
import { useAdmin } from '../AdminContext'
import { parseImportFile } from '../parseImportFile'
import { getAdminFlights, createAdminFlight, updateAdminFlight, deleteAdminFlight, importAdminFlights, exportAdminFlights } from '../../services/api'

const airlineOptions = [
  { code: 'VN', name: 'Vietnam Airlines' },
  { code: 'VJ', name: 'VietJet Air' },
  { code: 'QH', name: 'Bamboo Airways' },
  { code: 'BL', name: 'Pacific Airlines' },
  { code: 'VU', name: 'Vietravel Airlines' },
]

const seatClassOptions = [
  { value: 'Economy', label: 'Phổ thông (Economy)' },
  { value: 'Premium Economy', label: 'Phổ thông đặc biệt (Premium Economy)' },
  { value: 'Business', label: 'Thương gia (Business)' },
]

const columns = [
  { key: 'id', label: 'ID', render: v => <span className="text-xs font-mono text-[var(--color-text-tertiary)]">#{v.id}</span> },
  { key: 'flightNumber', label: 'Mã bay', render: v => (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center"><Plane className="w-3.5 h-3.5 text-primary-500" /></div>
      <span className="text-sm font-semibold text-[var(--color-text-primary)]">{v.flightNumber || v.airlineCode}</span>
    </div>
  )},
  { key: 'airlineName', label: 'Hãng' },
  { key: 'departure', label: 'Đi', render: v => <span className="text-sm text-[var(--color-text-secondary)]">{v.departureLocation}</span> },
  { key: 'arrival', label: 'Đến', render: v => <span className="text-sm text-[var(--color-text-secondary)]">{v.arrivalLocation}</span> },
  { key: 'seatClass', label: 'Hạng', render: v => <span className="text-xs px-2 py-0.5 rounded-md bg-primary-50 text-primary-600">{v.seatClass || '—'}</span> },
  { key: 'departureTime', label: 'Giờ đi', render: v => <span className="text-sm text-[var(--color-text-tertiary)] font-mono">{v.departureTime?.split('T')[0]}</span> },
  { key: 'price', label: 'Giá', align: 'right', render: v => (
    <span className="text-sm font-semibold text-primary-600">{Number(v.price).toLocaleString('vi-VN')} ₫</span>
  )},
]

export default function FlightsPage() {
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
    airlineCode: '', airlineName: '', flightNumber: '', departureLocation: '', arrivalLocation: '',
    departureTime: '', arrivalTime: '', price: '', seats: '', seatClass: 'Economy',
  })

  const [airlineFilter, setAirlineFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const fileInputRef = useRef(null)
  const [importing, setImporting] = useState(false)

  const fetchData = useCallback(() => {
    setLoading(true)
    const params = { page, search, pageSize: 10 }
    if (airlineFilter) params.airline = airlineFilter
    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    getAdminFlights(params)
      .then(res => {
        setData(res.data.items || res.data || [])
        setTotal(res.data.total || 0)
      })
      .catch(err => { console.error('[FlightsPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Không thể tải danh sách chuyến bay', 'error') })
      .finally(() => setLoading(false))
  }, [page, search, airlineFilter, dateFrom, dateTo])

  useEffect(() => { fetchData() }, [fetchData])

  const openCreate = () => {
    setEditing(null)
    setForm({ airlineCode: '', airlineName: '', flightNumber: '', departureLocation: '', arrivalLocation: '', departureTime: '', arrivalTime: '', price: '', seats: '', seatClass: 'Economy' })
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    setForm({
      airlineCode: row.airlineCode || '',
      airlineName: row.airlineName || '',
      flightNumber: row.flightNumber || '',
      departureLocation: row.departureLocation || '',
      arrivalLocation: row.arrivalLocation || '',
      departureTime: row.departureTime ? row.departureTime.slice(0, 16) : '',
      arrivalTime: row.arrivalTime ? row.arrivalTime.slice(0, 16) : '',
      price: row.price?.toString() || '',
      seats: row.seats?.toString() || '',
      seatClass: row.seatClass || 'Economy',
    })
    setModalOpen(true)
  }

  const handleAirlineChange = (name) => {
    const airline = airlineOptions.find(a => a.name === name)
    setForm(p => ({
      ...p,
      airlineCode: airline ? airline.code : p.airlineCode,
      airlineName: name,
    }))
  }

  const generateFlightCode = () => {
    const prefix = form.airlineCode && !/\d/.test(form.airlineCode) ? form.airlineCode : (airlineOptions[0]?.code || '')
    let code = ''
    for (let i = 0; i < 20; i++) {
      code = `${prefix}${Math.floor(100 + Math.random() * 900)}`
      if (!data.some(r => r.id !== editing?.id && (r.flightNumber || r.airlineCode) === code)) break
    }
    setForm(p => ({ ...p, flightNumber: code }))
  }

  const codeDuplicate = !!form.flightNumber && data.some(r => r.id !== editing?.id && (r.flightNumber || r.airlineCode) === form.flightNumber.trim())

  const handleDelete = (row) => {
    confirmAction('Xoá chuyến bay', `Bạn có chắc muốn xoá chuyến ${row.flightNumber || row.airlineCode}?`, async () => {
      try {
        await deleteAdminFlight(row.id)
        toast('Đã xoá chuyến bay', 'success')
        fetchData()
      } catch (err) { console.error('[FlightsPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Không thể xoá chuyến bay', 'error') }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const codeDuplicate = data.some(r => r.id !== editing?.id && (r.flightNumber || r.airlineCode) === form.flightNumber.trim())
    if (codeDuplicate) { toast(`Mã chuyến bay "${form.flightNumber}" đã tồn tại`, 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price), seats: parseInt(form.seats) }
      if (editing) {
        await updateAdminFlight(editing.id, payload)
        toast('Cập nhật chuyến bay thành công', 'success')
      } else {
        await createAdminFlight(payload)
        toast('Tạo chuyến bay thành công', 'success')
      }
      setModalOpen(false)
      fetchData()
    } catch (err) { console.error('[FlightsPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || (editing ? 'Không thể cập nhật' : 'Không thể tạo'), 'error') }
    finally { setSaving(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Quản lý chuyến bay</h2>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5">{total.toLocaleString('vi-VN')} chuyến bay</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv,.json,.xlsx,.xls" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return
            setImporting(true)
            try {
              const list = await parseImportFile(file)
              if (!Array.isArray(list) || list.length === 0) { toast('File không có dữ liệu', 'error'); return }
              const res = await importAdminFlights(list)
              toast(res.data?.message || `Đã nhập ${list.length} chuyến bay`, 'success')
              fetchData()
            } catch (err) { toast(err.response?.data?.message || 'Lỗi import file', 'error') }
            finally { setImporting(false); e.target.value = '' }
          }} />
          <button disabled={importing} onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]/30 transition-all disabled:opacity-50">
            <Upload className="w-4 h-4" />{importing ? 'Đang nhập...' : 'Import'}
          </button>
          <button onClick={async () => {
            try {
              const res = await exportAdminFlights({})
              const url = URL.createObjectURL(new Blob([res.data]))
              const a = document.createElement('a'); a.href = url; a.download = `flights_${new Date().toISOString().split('T')[0]}.csv`
              a.click(); URL.revokeObjectURL(url)
              toast('Xuất file CSV thành công', 'success')
            } catch (err) { toast('Lỗi xuất file', 'error') }
          }} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]/30 transition-all">
            <Download className="w-4 h-4" />Export
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-all shadow-sm">
            <Plus className="w-4 h-4" />
            Thêm chuyến bay
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
        searchPlaceholder="Tìm mã bay, hãng, tuyến..."
        filters={[
          { key: 'airline', label: 'Hãng bay', type: 'select', value: airlineFilter, onChange: v => { setAirlineFilter(v); setPage(1) }, options: [
            { label: 'Vietnam Airlines', value: 'VN' },
            { label: 'VietJet Air', value: 'VJ' },
            { label: 'Bamboo Airways', value: 'QH' },
            { label: 'Pacific Airlines', value: 'BL' },
            { label: 'Vietravel Airlines', value: 'VU' },
          ]},
          { key: 'dateFrom', label: 'Từ ngày', type: 'date', value: dateFrom, onChange: v => { setDateFrom(v); setPage(1) } },
          { key: 'dateTo', label: 'Đến ngày', type: 'date', value: dateTo, onChange: v => { setDateTo(v); setPage(1) } },
        ]}
        emptyIcon={Plane}
        emptyTitle="Không có chuyến bay nào"
        emptyDesc="Thử thay đổi từ khoá tìm kiếm hoặc thêm chuyến bay mới."
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
        title={editing ? 'Sửa chuyến bay' : 'Thêm chuyến bay'}
        icon={Plane}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel={editing ? 'Cập nhật' : 'Tạo chuyến bay'}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5">Hãng bay</label>
            <select required value={form.airlineName} onChange={e => handleAirlineChange(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all">
              <option value="">Chọn hãng bay</option>
              {airlineOptions.map(a => <option key={a.code} value={a.name}>{a.name} ({a.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5">Mã chuyến bay</label>
            <div className="flex gap-2">
              <input value={form.flightNumber} onChange={e => setForm(p => ({ ...p, flightNumber: e.target.value }))} placeholder="VN123 (để trống để tự sinh)" className="flex-1 w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all" />
              <button type="button" onClick={generateFlightCode} className="px-3 py-2.5 rounded-xl text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-all whitespace-nowrap">Tự sinh</button>
            </div>
            {codeDuplicate && <p className="mt-1.5 text-[11px] font-medium text-[var(--color-danger)]">Mã này đã tồn tại, vui lòng đổi mã.</p>}
          </div>
          <LocationSelect label="Đi" value={form.departureLocation} onChange={v => setForm(p => ({ ...p, departureLocation: v }))} placeholder="Chọn điểm đi" />
          <LocationSelect label="Đến" value={form.arrivalLocation} onChange={v => setForm(p => ({ ...p, arrivalLocation: v }))} placeholder="Chọn điểm đến" />
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
            <input type="number" required value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="1500000" className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5">Hạng ghế</label>
            <select required value={form.seatClass} onChange={e => setForm(p => ({ ...p, seatClass: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all">
              {seatClassOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5">Số ghế</label>
            <input type="number" required value={form.seats} onChange={e => setForm(p => ({ ...p, seats: e.target.value }))} placeholder="180" className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all" />
          </div>
        </div>
      </ModalForm>
    </motion.div>
  )
}
