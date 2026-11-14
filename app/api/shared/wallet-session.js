import {createHmac, timingSafeEqual} from 'node:crypto';

const SESSION_COOKIE = 'fieldwork_session';

export function sealWalletValue(value) {
  const secret = process.env.FIELDWORK_SESSION_SECRET;
  if (!secret || secret.length < 32) throw Error('Configure FIELDWORK_SESSION_SECRET with at least 32 characters.');
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return payload + '.' + createHmac('sha256', secret).update(payload).digest('base64url');
}

export function openWalletValue(token) {
  try {
    if (typeof token !== 'string' || token.length > 6000) return null;
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return null;
    const expected = sealWalletValue(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))).split('.')[1];
    const actualBytes = Buffer.from(signature, 'base64url');
    const expectedBytes = Buffer.from(expected, 'base64url');
    if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isSafeInteger(value.expires) && value.expires > Date.now() ? value : null;
  } catch { return null; }
}

export function walletCookie(request, name) {
  return request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(name + '='))?.slice(name.length + 1) || '';
}

export function makeWalletCookie(request, name, value, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return name + '=' + value + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAge + secure;
}

export function sameWalletOrigin(request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}

export function requireWalletSession(request) {
  const origin = request.headers.get('origin');
  if (origin && !sameWalletOrigin(request)) return null;
  const value = openWalletValue(walletCookie(request, SESSION_COOKIE));
  return value?.kind === 'session' && value.network === 'mainnet' && typeof value.accountId === 'string' ? value : null;
}

export function sessionCookie(request, session) {
  return makeWalletCookie(request, SESSION_COOKIE, session ? sealWalletValue(session) : '', session ? 86400 : 0);
}
