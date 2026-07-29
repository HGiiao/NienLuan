import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Nguyễn Thị Minh',
    role: 'Nhân viên văn phòng',
    avatar: 'NM',
    rating: 5,
    text: 'Tôi đã tiết kiệm được gần 500.000₫ cho chuyến bay Hà Nội - TP.HCM nhờ so sánh giá trên Vé247. Giao diện dễ sử dụng, thao tác nhanh gọn.',
    gradient: 'from-primary-500 to-primary-600',
  },
  {
    name: 'Trần Văn Hoàng',
    role: 'Freelancer',
    avatar: 'TH',
    rating: 5,
    text: 'Thường xuyên di chuyển giữa các tỉnh nên mình rất cần một công cụ so sánh giá. Vé247 giúp mình chọn được vé tàu giá rẻ mà không mất công lục tung các trang.',
    gradient: 'from-primary-500 to-primary-600',
  },
  {
    name: 'Lê Thị Hương',
    role: 'Hướng dẫn viên du lịch',
    avatar: 'LH',
    rating: 5,
    text: 'Tính năng theo dõi xu hướng giá rất hữu ích. Mình biết được thời điểm nào giá rẻ nhất để đặt vé cho đoàn khách. Tiết kiệm được kha khá chi phí.',
    gradient: 'from-primary-500 to-primary-600',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5 } },
}

export default function TestimonialsSection() {
  const [active, setActive] = useState(0)

  const next = () => setActive(prev => (prev + 1) % testimonials.length)
  const prev = () => setActive(prev => (prev - 1 + testimonials.length) % testimonials.length)

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 bg-primary-50 px-4 py-1.5 rounded-full tracking-wider uppercase mb-4">
            <Quote className="w-3 h-3" />
            Khách hàng nói gì
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] tracking-tight mb-3">
            Người dùng yêu thích Vé247
          </h2>
          <p className="text-[var(--color-text-secondary)] max-w-xl mx-auto">
            Hàng ngàn khách hàng đã tin tưởng sử dụng nền tảng của chúng tôi
          </p>
        </motion.div>

        <div className="hidden md:grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="group bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, s) => (
                  <Star key={s} className="w-4 h-4 fill-primary-400 text-primary-400" />
                ))}
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-5 italic">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white text-xs font-bold`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t.name}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="md:hidden">
          <motion.div
            key={active}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6"
          >
            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: testimonials[active].rating }).map((_, s) => (
                <Star key={s} className="w-4 h-4 fill-primary-400 text-primary-400" />
              ))}
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-5 italic">
              &ldquo;{testimonials[active].text}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${testimonials[active].gradient} flex items-center justify-center text-white text-xs font-bold`}>
                {testimonials[active].avatar}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{testimonials[active].name}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">{testimonials[active].role}</p>
              </div>
            </div>
          </motion.div>
          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              onClick={prev}
              className="w-9 h-9 rounded-xl border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-tertiary)] hover:bg-[var(--color-border)]/40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === active
                    ? 'bg-primary-500 w-6'
                    : 'bg-[var(--color-border)] hover:bg-[var(--color-border-hover)]'
                }`}
              />
            ))}
            <button
              onClick={next}
              className="w-9 h-9 rounded-xl border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-tertiary)] hover:bg-[var(--color-border)]/40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
