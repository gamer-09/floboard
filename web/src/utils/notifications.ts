export type ToastDetail = { title: string; body: string; href?: string }

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia?.('(display-mode: standalone)')?.matches
  const ios = (navigator as Navigator & { standalone?: boolean }).standalone
  return Boolean(mq || ios)
}

export function osNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && typeof Notification !== 'undefined'
}

export function areNotificationsSupported(): boolean {
  return typeof window !== 'undefined'
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!osNotificationsSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!osNotificationsSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch {
    return false
  }
}

function emitToast(title: string, body: string, href?: string) {
  try {
    window.dispatchEvent(new CustomEvent<ToastDetail>('floboard:toast', { detail: { title, body, href } }))
  } catch { /* ignore */ }
}

export async function sendLocalNotification(
  title: string,
  body: string,
  opts?: { tag?: string; href?: string },
): Promise<void> {
  emitToast(title, body, opts?.href)
  if (!osNotificationsSupported()) return
  if (Notification.permission !== 'granted') return
  try {
    const reg = await navigator.serviceWorker?.ready.catch(() => undefined)
    if (reg?.showNotification) {
      await reg.showNotification(title, {
        body,
        tag: opts?.tag,
        data: { href: opts?.href || '#/markets' },
        silent: false,
      })
      return
    }
  } catch { /* fall through */ }
  try {
    const n = new Notification(title, { body, tag: opts?.tag, silent: false })
    n.onclick = () => {
      window.focus()
      if (opts?.href) location.hash = opts.href
      n.close()
    }
  } catch { /* iOS Safari in a tab cannot construct Notification */ }
}

export function registerNotificationWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  const sw = `${import.meta.env.BASE_URL}sw.js`
  void navigator.serviceWorker.register(sw, { scope: import.meta.env.BASE_URL }).catch(() => {})
}
