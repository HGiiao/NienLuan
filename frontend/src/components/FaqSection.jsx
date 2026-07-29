import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle } from 'lucide-react'

const faqs = [
  {
    q: 'Vé247 là gì?',
    a: 'Vé247 là nền tảng so sánh giá vé máy bay và tàu hỏa tại Việt Nam. Chúng tôi tổng hợp và so sánh giá từ nhiều nhà cung cấp, giúp bạn tìm được chuyến đi phù hợp với ngân sách nhất.',
  },
  {
    q: 'Đặt vé trên Vé247 có mất phí không?',
    a: 'Hoàn toàn miễn phí! Bạn có thể so sánh giá và chuyển đến website đặt vé chính thức mà không mất bất kỳ khoản phí nào.',
  },
  {
    q: 'Làm thế nào để so sánh giá vé?',
    a: 'Chỉ cần nhập điểm đi, điểm đến và ngày đi. Hệ thống sẽ tự động tổng hợp và hiển thị giá vé từ tất cả các hãng bay và tàu hỏa để bạn dễ dàng so sánh.',
  },
  {
    q: 'Giá vé có được cập nhật thường xuyên không?',
    a: 'Có. Giá vé được cập nhật liên tục từ các nhà cung cấp. Bạn cũng có thể theo dõi xu hướng giá theo ngày để chọn thời điểm đặt vé tốt nhất.',
  },
  {
    q: 'Tôi có thể hủy đặt chỗ sau khi đặt không?',
    a: 'Vé247 là nền tảng so sánh giá, chúng tôi dẫn bạn đến website đặt vé chính thức. Chính sách hủy và hoàn tiền phụ thuộc vào nhà cung cấp bạn chọn.',
  },
  {
    q: 'Làm sao để nhận thông báo khi giá giảm?',
    a: 'Sử dụng tính năng "Cảnh báo giá" trên Vé247. Chọn tuyến đường và mức giá mục tiêu, chúng tôi sẽ thông báo khi giá giảm xuống mức bạn mong muốn.',
  },
]

export default function FaqSection() {
  const [open, setOpen] = useState(null)

  return (
    <section className="py-16 md:py-24 bg-[var(--color-surface-50)]">
      <div className="max-w-3xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 bg-primary-50 px-4 py-1.5 rounded-full tracking-wider uppercase mb-4">
            <HelpCircle className="w-3 h-3" />
            Hỗ trợ
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] tracking-tight mb-3">
            Câu hỏi thường gặp
          </h2>
          <p className="text-[var(--color-text-secondary)]">
            Những thắc mắc phổ biến về Vé247
          </p>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = open === i
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden hover:border-[var(--color-border-hover)] transition-colors"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-5 md:px-6 py-4 md:py-5 text-left"
                >
                  <span className="text-sm md:text-base font-semibold text-[var(--color-text-primary)] pr-4">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 md:px-6 pb-4 md:pb-5">
                        <div className="w-full h-px bg-[var(--color-border)] mb-3" />
                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                          {faq.a}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
