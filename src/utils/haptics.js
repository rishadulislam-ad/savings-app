import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = typeof window !== 'undefined' && (window.Capacitor?.isNativePlatform?.() || navigator.userAgent.includes('Capacitor'));

function isEnabled() {
  try { return localStorage.getItem('coinova_haptic_enabled') !== 'false'; }
  catch { return true; }
}

export function lightTap() {
  if (!isNative || !isEnabled()) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

export function mediumTap() {
  if (!isNative || !isEnabled()) return;
  Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
}

export function heavyTap() {
  if (!isNative || !isEnabled()) return;
  Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
}

export function successTap() {
  if (!isNative || !isEnabled()) return;
  Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}

export function errorTap() {
  if (!isNative || !isEnabled()) return;
  Haptics.notification({ type: NotificationType.Error }).catch(() => {});
}

export function warningTap() {
  if (!isNative || !isEnabled()) return;
  Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
}
