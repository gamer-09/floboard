import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ToastDetail } from '../utils/notifications'

interface Item extends ToastDetail { id: number }

export default function Toasts() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    const onToast = (e: Event) => {
      const d = (e as CustomEvent<ToastDetail>).detail
      if (!d?.title) return
      const id = Date.now() + Math.random()
      setItems((prev) => [...prev.slice(-2), { id, ...d }])
      window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 8000)
    }
    window.addEventListener('floboard:toast', onToast)
    return () => window.removeEventListener('floboard:toast', onToast)
  }, [])

  if (!items.length) return null

  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          className="toast"
          onClick={() => {
            const href = t.href || '#/markets'
            const path = href.replace(/^#/, '')
            navigate(path.startsWith('/') ? path : `/${path}`)
            setItems((prev) => prev.filter((x) => x.id !== t.id))
          }}
        >
          <div className="toast-title">{t.title}</div>
          {t.body && <div className="toast-body">{t.body}</div>}
        </button>
      ))}
    </div>
  )
}
