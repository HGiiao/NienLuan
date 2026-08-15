import { useEffect, useRef } from 'react'

/**
 * Tự động gọi lại `refetch` khi tab trở nên hiển thị/được focus —
 * dùng để load lại dữ liệu mới khi mở tab mới, chuyển qua lại giữa các tab,
 * hoặc trang được khôi phục từ bộ nhớ (bfcache qua `pageshow`).
 *
 * Guard `minIntervalMs` (mặc định 3s) tránh fetch trùng ngay sau khi mount
 * (focus/visibilitychange cũng fire ngay khi trang vừa tải xong).
 */
export default function useRefetchOnTabVisible(refetch, { enabled = true, minIntervalMs = 3000 } = {}) {
  const refetchRef = useRef(refetch)
  const lastRunRef = useRef(0)

  // Luôn dùng callback mới nhất mà không cần đưa refetch vào dependency effect
  refetchRef.current = refetch

  useEffect(() => {
    if (!enabled) return

    const run = () => {
      const now = Date.now()
      if (now - lastRunRef.current < minIntervalMs) return
      lastRunRef.current = now
      refetchRef.current?.()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') run()
    }
    const onFocus = () => run()
    const onPageShow = (e) => {
      // Trang được khôi phục từ bfcache (back/forward) — data cũ bị giữ lại
      if (e.persisted) run()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onPageShow)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [enabled, minIntervalMs])
}
