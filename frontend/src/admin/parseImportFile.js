export function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  row.push(field)
  if (row.length > 1 || row[0] !== '') rows.push(row)

  if (rows.length < 2) return []
  const headers = rows[0].map(h => h.trim())
  return rows.slice(1).map(r => {
    const obj = {}
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim() })
    return obj
  })
}

function toIsoString(value) {
  const d = value instanceof Date ? value : new Date(value)
  return isNaN(d.getTime()) ? String(value) : d.toISOString()
}

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30)

function looksLikeExcelSerial(val) {
  return typeof val === 'number' && val > 20000 && val < 80000
}

async function parseExcel(file) {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { cellDates: true })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return []
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true })
  return raw.map(row => {
    const obj = {}
    for (const [key, val] of Object.entries(row)) {
      const k = String(key).trim()
      if (val instanceof Date) obj[k] = toIsoString(val)
      else if (/date|time/i.test(k) && looksLikeExcelSerial(val)) obj[k] = new Date(EXCEL_EPOCH_MS + val * 86400000).toISOString()
      else if (typeof val === 'string') obj[k] = val.trim()
      else if (val === null || val === undefined) obj[k] = ''
      else obj[k] = String(val)
    }
    return obj
  })
}

export async function parseImportFile(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseExcel(file)

  const text = await file.text()
  const isJson = name.endsWith('.json') || text.trimStart().startsWith('[') || text.trimStart().startsWith('{')
  if (!isJson) return parseCsv(text)

  const data = JSON.parse(text)
  if (Array.isArray(data)) return data
  return data.items || data.flights || data.trains || data.buses || []
}
