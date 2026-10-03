export function areNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && typeof Notification !== 'undefined'
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!areNotificationsSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!areNotificationsSupported()) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  try {
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch {
    return false
  }
}

export function sendLocalNotification(
  title: string,
  body: string,
  opts?: { tag?: string; href?: string },
): void {
  if (!areNotificationsSupported()) return
  if (Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, {
      body,
      tag: opts?.tag,
      silent: false,
    })
    n.onclick = () => {
      window.focus()
      if (opts?.href) location.hash = opts.href
      n.close()
    }
  } catch {
    /* some browsers throw if the tab is in the background without permission */
  }
}
