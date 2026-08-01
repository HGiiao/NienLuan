import { useEffect, useState } from 'react'
import { Building2, User, Landmark, Copy, Check, QrCode, Banknote, ClipboardList } from 'lucide-react'
import { BANK_CONFIG } from '../config/bank'
import { buildVietQrImageUrl, buildLocalQrDataUrl } from '../utils/vietqr'
import { formatCurrencyVnd } from '../utils/formatters'

export default function BankTransferPanel({ amount, content }) {
  const [loaded, setLoaded] = useState(false)
  const [qrFailed, setQrFailed] = useState(false)
  const [localQr, setLocalQr] = useState('')
  const [copied, setCopied] = useState('')

  const numericAmount = Math.round(Number(amount || 0))
  const qrContent = content || `VE247 ${numericAmount}`
  const qrSrc = buildVietQrImageUrl({ amount: numericAmount, content: qrContent })

  useEffect(() => {
    setLoaded(false)
    setQrFailed(false)
    setLocalQr('')
  }, [qrSrc])

  const handleError = () => {
    if (qrFailed) return
    setQrFailed(true)
    buildLocalQrDataUrl({ amount: numericAmount, content: qrContent }).then(setLocalQr)
  }

  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 2000)
    } catch {}
  }

  const rows = [
    { key: 'bank', icon: Building2, label: 'Ngân hàng', value: BANK_CONFIG.bankName },
    { key: 'holder', icon: User, label: 'Chủ tài khoản', value: BANK_CONFIG.accountHolder },
    { key: 'account', icon: Landmark, label: 'Số tài khoản', value: BANK_CONFIG.accountNumber },
  ]

  return (
    <div className="grid md:grid-cols-2 gap-4 rounded-2xl border border-primary-500/20 bg-primary-500/5 p-4 md:p-5">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0">
            <Building2 className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Thông tin tài khoản nhận</h4>
            <p className="text-[11px] text-[var(--color-text-tertiary)]">Quý khách vui lòng chuyển khoản đến tài khoản bên dưới</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {rows.map(r => (
            <div key={r.key} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
              <div className="flex items-center gap-3 min-w-0">
                <r.icon className="w-4 h-4 text-primary-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-[var(--color-text-tertiary)]">{r.label}</p>
                  <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">{r.value}</p>
                </div>
              </div>
              <button type="button" onClick={() => copy(r.key, r.value)}
                className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-primary-500 hover:bg-primary-500/10 transition-colors shrink-0">
                {copied === r.key ? <Check className="w-4 h-4 text-[var(--color-success)]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <ClipboardList className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--color-text-secondary)]">
            Vui lòng nhập đúng <strong className="text-[var(--color-text-primary)]">nội dung chuyển khoản</strong> và{' '}
            <strong className="text-[var(--color-text-primary)]">số tiền</strong> để đơn hàng được xác nhận nhanh nhất.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-2 mb-3">
          <QrCode className="w-4 h-4 text-primary-500" />
          <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Quét mã VietQR để chuyển khoản</h4>
        </div>

        <div className="bg-white rounded-2xl p-3 shadow-sm border border-[var(--color-border)]">
          <img
            key={qrSrc}
            src={localQr || qrSrc}
            alt="VietQR"
            onLoad={() => setLoaded(true)}
            onError={handleError}
            className={`w-48 h-48 md:w-56 md:h-56 ${loaded ? 'block' : 'hidden'}`}
          />
          {!loaded && (
            <div className="w-48 h-48 md:w-56 md:h-56 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        <div className="w-full mt-4 space-y-2">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
            <div className="flex items-center gap-2 min-w-0">
              <Banknote className="w-4 h-4 text-primary-500 shrink-0" />
              <div className="min-w-0 text-left">
                <p className="text-[11px] text-[var(--color-text-tertiary)]">Số tiền</p>
                <p className="text-sm font-black text-primary-500 truncate">{formatCurrencyVnd(numericAmount)}</p>
              </div>
            </div>
            <button type="button" onClick={() => copy('amount', String(numericAmount))}
              className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-primary-500 hover:bg-primary-500/10 transition-colors shrink-0">
              {copied === 'amount' ? <Check className="w-4 h-4 text-[var(--color-success)]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]">
            <div className="flex items-center gap-2 min-w-0">
              <ClipboardList className="w-4 h-4 text-primary-500 shrink-0" />
              <div className="min-w-0 text-left">
                <p className="text-[11px] text-[var(--color-text-tertiary)]">Nội dung chuyển khoản</p>
                <p className="text-sm font-bold text-[var(--color-text-primary)] truncate">{qrContent}</p>
              </div>
            </div>
            <button type="button" onClick={() => copy('content', qrContent || '')}
              className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-primary-500 hover:bg-primary-500/10 transition-colors shrink-0">
              {copied === 'content' ? <Check className="w-4 h-4 text-[var(--color-success)]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
