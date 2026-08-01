import QRCode from 'qrcode'
import { BANK_CONFIG } from '../config/bank'

function padLen(value) {
  return value.length < 100 ? String(value.length).padStart(2, '0') : String(value.length)
}

function field(tag, value) {
  return tag + padLen(value) + value
}

function crc16(data) {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0')
}

export function buildVietQrPayload({ bankCode, accountNumber, accountName, amount, content, merchantName, merchantCity }) {
  const merchant = [
    field('00', 'A000000727'),
    field('01', bankCode),
    field('02', accountNumber),
  ]
  if (accountName) merchant.push(field('03', accountName))

  const chunks = [
    field('00', '01'),
    field('01', '12'),
    field('26', merchant.join('')),
    field('52', '0000'),
    field('53', '704'),
  ]
  if (amount && Number(amount) > 0) {
    chunks.push(field('54', String(Math.round(Number(amount)))))
  }
  chunks.push(field('58', 'VN'))
  if (merchantName) chunks.push(field('59', merchantName))
  if (merchantCity) chunks.push(field('60', merchantCity))
  if (content) chunks.push(field('62', field('01', content)))

  const data = chunks.join('')
  return data + field('63', crc16(data))
}

export function sanitizeContent(content) {
  return (content || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 25)
}

export function buildVietQrImageUrl({ amount, content }) {
  const numericAmount = Math.round(Number(amount || 0))
  const params = new URLSearchParams({ accountName: BANK_CONFIG.accountHolder })
  if (numericAmount > 0) params.set('amount', String(numericAmount))
  if (content) params.set('addInfo', sanitizeContent(content))
  return `https://api.vietqr.io/image/${BANK_CONFIG.acqId}-${BANK_CONFIG.accountNumber}-compact2.jpg?${params.toString().replace(/\+/g, '%20')}`
}

export async function buildLocalQrDataUrl({ amount, content }) {
  const numericAmount = Math.round(Number(amount || 0))
  const addInfo = sanitizeContent(content || `VE247 ${numericAmount}`)
  const payload = buildVietQrPayload({
    bankCode: BANK_CONFIG.bankCode,
    accountNumber: BANK_CONFIG.accountNumber,
    accountName: BANK_CONFIG.accountHolder,
    amount: numericAmount,
    content: addInfo,
    merchantName: BANK_CONFIG.merchantName,
    merchantCity: BANK_CONFIG.merchantCity,
  })
  try {
    return await QRCode.toDataURL(payload, { width: 240, margin: 1, errorCorrectionLevel: 'M' })
  } catch {
    return ''
  }
}
