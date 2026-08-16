import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Tag, Plus, Trash2, Percent, Coins, CalendarDays } from 'lucide-react'
import DataTable from '../DataTable'
import ModalForm from '../ModalForm'
import { useAdmin } from '../AdminContext'
import { getAdminPromoCodes, createAdminPromoCode, deleteAdminPromoCode } from '../../services/api'
import { formatCurrencyVnd } from '../../utils/formatters'

const columns = [
  { key: 'code', label: 'Mã giảm giá', render: v => (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center"><Tag className="w-3.5 h-3.5 text-primary-500" /></div>
      <span className="text-sm font-bold text-primary-600 font-mono">{v.code}</span>
    </div>
  )},
  { key: 'description', label: 'Mô tả', render: v => <span className="text-sm text-[var(--color-text-secondary)]">{v.description || '—'}</span> },
  { key: 'discountPercent', label: 'Giảm', render: v => (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600"><Percent className="w-3 h-3" />{v.discountPercent}%</span>
  )},
  { key: 'maxDiscount', label: 'Tối đa', align: 'right', render: v => <span className="text-sm text-[var(--color-text-secondary)]">{formatCurrencyVnd(v.maxDiscount)}</span> },
  { key: 'minOrderValue', label: 'Đơn tối thiểu', align: 'right', render: v => <span className="text-sm text-[var(--color-text-tertiary)]">{formatCurrencyVnd(v.minOrderValue)}</span> },
  { key: 'usage', label: 'Đã dùng', align: 'right', render: v => (
    <span className="text-sm text-[var(--color-text-secondary)]">{v.usedCount}<span className="text-[var(--color-text-tertiary)]">/{v.usageLimit}</span></span>
  )},
  { key: 'valid', label: 'Hiệu lực', render: v => (
    <div className="flex items-center gap-1.5">
      <CalendarDays className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
      <span className="text-xs text-[var(--color-text-tertiary)] font-mono">{v.validFrom?.split('T')[0]} → {v.validTo?.split('T')[0]}</span>
    </div>
  )},
  { key: 'isActive', label: 'Trạng thái', render: v => (
    v.isActive
      ? <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20">Đang chạy</span>
      : <span className="inline-flex px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20">Đã tắt</span>
  )},
]

const emptyForm = { code: '', description: '', discountPercent: '', maxDiscount: '', minOrderValue: '', usageLimit: '100', validFrom: '', validTo: '' }

export default function PromoCodesPage() {
  const { toast, confirmAction } = useAdmin()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const fetchData = useCallback(() => {
    setLoading(true)
    getAdminPromoCodes()
      .then(res => setData(res.data || []))
      .catch(err => { console.error('[PromoCodesPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Không thể tải danh sách mã giảm giá', 'error') })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDelete = (row) => {
    confirmAction('Xoá mã giảm giá', `Bạn có chắc muốn xoá mã ${row.code}? Hành động này không thể hoàn tác.`, async () => {
      try {
        await deleteAdminPromoCode(row.id)
        toast('Đã xoá mã giảm giá', 'success')
        fetchData()
      } catch (err) { console.error('[PromoCodesPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Không thể xoá mã giảm giá', 'error') }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        code: form.code,
        description: form.description,
        discountPercent: parseFloat(form.discountPercent),
        maxDiscount: parseFloat(form.maxDiscount || 0),
        minOrderValue: parseFloat(form.minOrderValue || 0),
        usageLimit: parseInt(form.usageLimit || 100),
        validFrom: form.validFrom,
        validTo: form.validTo,
      }
      await createAdminPromoCode(payload)
      toast('Tạo mã giảm giá thành công', 'success')
      setModalOpen(false)
      setForm(emptyForm)
      fetchData()
    } catch (err) { console.error('[PromoCodesPage] Error:', err.response?.data || err.message); toast(err.response?.data?.message || 'Không thể tạo mã giảm giá', 'error') }
    finally { setSaving(false) }
  }

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
  const labelCls = "block text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase mb-1.5"

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Quản lý mã giảm giá</h2>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5">{data.length} mã — khách áp dụng khi thanh toán, hiển thị trên trang chủ</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setModalOpen(true) }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-all shadow-sm">
          <Plus className="w-4 h-4" />
          Tạo mã giảm giá
        </button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyIcon={Tag}
        emptyTitle="Chưa có mã giảm giá nào"
        emptyDesc="Tạo mã đầu tiên để khuyến mãi cho khách hàng."
        actions={(row) => (
          <button onClick={() => handleDelete(row)} className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors" title="Xoá mã"><Trash2 className="w-3.5 h-3.5" /></button>
        )}
      />

      <ModalForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tạo mã giảm giá"
        icon={Tag}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel="Tạo mã"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Mã khuyến mãi</label>
            <input required value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="WELCOME10" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phần trăm giảm (%)</label>
            <input type="number" required min="1" max="100" value={form.discountPercent} onChange={e => setForm(p => ({ ...p, discountPercent: e.target.value }))} placeholder="10" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Mô tả (hiển thị cho khách)</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Giảm 10% cho đơn đầu tiên" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Giảm tối đa (VND)</label>
            <input type="number" value={form.maxDiscount} onChange={e => setForm(p => ({ ...p, maxDiscount: e.target.value }))} placeholder="100000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Đơn hàng tối thiểu (VND)</label>
            <input type="number" value={form.minOrderValue} onChange={e => setForm(p => ({ ...p, minOrderValue: e.target.value }))} placeholder="500000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Số lượt dùng tối đa</label>
            <input type="number" value={form.usageLimit} onChange={e => setForm(p => ({ ...p, usageLimit: e.target.value }))} placeholder="100" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ngày bắt đầu</label>
            <input type="date" required value={form.validFrom} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ngày kết thúc</label>
            <input type="date" required value={form.validTo} onChange={e => setForm(p => ({ ...p, validTo: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex items-start gap-2 p-3 rounded-xl bg-primary-500/5 border border-primary-500/15">
            <Coins className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--color-text-secondary)]">
              Ví dụ: mã <strong>WELCOME10</strong>, giảm <strong>10%</strong>, tối đa <strong>100.000đ</strong>, áp dụng cho đơn từ <strong>500.000đ</strong>. Khách sẽ thấy mã này trong banner khuyến mãi trên trang chủ.
            </p>
          </div>
        </div>
      </ModalForm>
    </motion.div>
  )
}
