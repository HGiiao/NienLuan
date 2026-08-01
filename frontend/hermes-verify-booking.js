const fs = require('fs');
const path = require('path');

const root = process.cwd();
const file = path.resolve(root, 'frontend/src/pages/BookingPage.jsx');
const content = fs.readFileSync(file, 'utf8');

const ok = [
  ['lucide import includes Check', content.includes("Check") && content.includes("from 'lucide-react'")],
  ['header enhanced with icon box', /inline-flex items-center justify-center w-12 h-12/.test(content) && content.includes('shadow-lg shadow-primary-500/20')],
  ['step indicator present', content.includes('Thông tin') && content.includes('Thanh toán') && content.includes('border-l-4 border-primary-500')],
  ['insurance section header', content.includes('Bảo hiểm chuyến đi') && content.includes('Đề xuất')],
  ['insurance badge upgraded', content.includes('bg-accent-500/10 text-accent-500')],
  ['payment header block', content.includes('Phương thức thanh toán') && content.includes('Chọn 1 phương thức để tiếp tục')],
  ['payment method card enhanced', content.includes('w-10 h-10 rounded-xl') && content.includes('shadow-md shadow-primary-500/20')],
  ['error ui as pill', content.includes('flex items-center gap-2') && content.includes('w-2 h-2 rounded-full bg-[var(--color-danger)]')],
  ['security pill styled', content.includes('rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]')],
  ['trip summary preserved', content.includes('Chi tiết vé') && content.includes('formatCurrencyVnd(totalPrice)')],
];

console.log('BookingPage verification results:');
ok.forEach(([name, pass]) => console.log(`- ${pass ? 'PASS' : 'FAIL'}: ${name}`));

if (ok.some(([,v]) => !v)) process.exit(1);
console.log('\nBookingPage redesign checks passed (ad-hoc).');
