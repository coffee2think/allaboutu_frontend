import { reactive } from "vue";

const SESSION_KEYS = [
  'accessToken',
  'refreshToken',
  'userId',
  'role',
  'enrollType',
];

export const authState = reactive({
  isLoggedIn: false,
  userId: null,
});

let expiryTimer = null;
let onSessionExpired = () => {};
let stopMonitor = null;

function cancelExpiryTimer() {
  clearTimeout(expiryTimer);
  expiryTimer = null;
}

export function getJwtPayload(token) {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid JWT');
  }

  let encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  encoded = encoded.padEnd(
    encoded.length + ((4 - (encoded.length % 4)) % 4),
    "="
  );

  const bytes = Uint8Array.from(
    atob(encoded),
    character => character.charCodeAt(0)
  );

  return JSON.parse(new TextDecoder().decode(bytes));
}

export function clearSession() {
  cancelExpiryTimer();

  SESSION_KEYS.forEach(key => sessionStorage.removeItem(key));

  authState.isLoggedIn = false;
  authState.userId = null;
}

export function expireSession() {
  const hadSession = authState.isLoggedIn || sessionStorage.getItem('accessToken') !== null;

  clearSession();

  if (hadSession) {
    onSessionExpired();
  }
}

export function syncSession() {
  cancelExpiryTimer();

  const token = sessionStorage.getItem('accessToken');

  if (!token) {
    clearSession();
    return false;
  }

  try {
    const payload = getJwtPayload(token);

    if (!Number.isFinite(payload.exp) || !payload.sub) {
      throw new Error('Invalid JWT payload');
    }

    const remaining = payload.exp * 1000 - Date.now();

    if (remaining <= 0) {
      expireSession();
      return false;
    }

    authState.isLoggedIn = true;
    authState.userId = payload.sub;

    // 긴 유효기간도 setTimeout의 최대 지연 시간을 넘지 않는다.
    expiryTimer = setTimeout(
      syncSession,
      Math.min(remaining, 2 ** 31 - 1)
    );

    return true;
  } catch {
    expireSession();
    return false;
  }
}

export function saveSession({
  accessToken,
  refreshToken,
  userId,
  role,
  enrollType = 'MEMBER'
}) {
  clearSession();

  const values = {
    accessToken,
    refreshToken,
    userId,
    role,
    enrollType
  };

  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      // JWT에 JSON.stringify 적용하지 않음
      sessionStorage.setItem(key, String(value));
    }
  });

  return syncSession();
}

export function startAuthMonitor(onExpired) {
  stopMonitor?.();
  onSessionExpired = onExpired;

  const handleFocus = () => syncSession();
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      syncSession();
    }
  };

  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleVisibility);

  syncSession();

  stopMonitor = () => {
    cancelExpiryTimer();
    window.removeEventListener('focus', handleFocus);
    document.removeEventListener('visibilitychange', handleVisibility);
    onSessionExpired = () => {};
    stopMonitor = null;
  };

  return stopMonitor;
}