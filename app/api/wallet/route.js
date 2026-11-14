import {randomBytes} from 'node:crypto';
import {insert} from '../fieldtest/storage.js';
import {makeWalletCookie, openWalletValue, requireWalletSession, sameWalletOrigin, sealWalletValue, sessionCookie, walletCookie} from '../shared/wallet-session.js';
import {accountHasFullAccessKey, verifyWalletSignature} from './verify.js';

export const runtime = 'nodejs';
const challengeCookie = 'fieldwork_challenge';
const reply = (body, status = 200, cookie) => Response.json(body, {status, headers:{'Cache-Control':'no-store', ...(cookie ? {'Set-Cookie':cookie} : {})}});

export async function GET(request) {
  const session = requireWalletSession(request);
  return reply({session:session ? {id:session.id, accountId:session.accountId, network:session.network, expires:session.expires} : null});
}

export async function POST(request) {
  if (!sameWalletOrigin(request)) return reply({error:'Open wallet sign-in from Fieldwork.'}, 403);
  try {
    const data = await request.json();
    if (data.op === 'logout') return reply({ok:true}, 200, sessionCookie(request, null));
    if (data.op === 'challenge') {
      const origin = new URL(request.url).origin;
      const challenge = {
        kind:'challenge', id:randomBytes(16).toString('hex'),
        message:'Sign in to Fieldwork on NEAR mainnet. This request authorizes access to your Fieldwork workspace.',
        nonce:randomBytes(32).toString('base64'), recipient:new URL(origin).host,
        callbackUrl:origin + '/fieldwork.html', expires:Date.now() + 300000
      };
      return reply({...challenge, state:challenge.id}, 200, makeWalletCookie(request, challengeCookie, sealWalletValue(challenge), 300));
    }
    if (data.op !== 'verify') return reply({error:'Unknown wallet operation.'}, 400);
    const challenge = openWalletValue(walletCookie(request, challengeCookie));
    if (!challenge || challenge.kind !== 'challenge' || challenge.id !== data.id || challenge.recipient !== new URL(request.url).host) return reply({error:'Sign-in expired. Connect your NEAR wallet again.'}, 401);
    if (typeof data.accountId !== 'string' || data.accountId.length < 2 || data.accountId.length > 64 || !/^[a-z0-9]+([._-][a-z0-9]+)*$/.test(data.accountId) || data.accountId.endsWith('.testnet')) return reply({error:'Choose a NEAR mainnet account.'}, 400);
    if (!verifyWalletSignature(challenge, data.publicKey, data.signature)) return reply({error:'The wallet signature did not match this sign-in request.'}, 401);
    if (!await accountHasFullAccessKey(data.accountId, data.publicKey)) return reply({error:'This key does not control the selected NEAR account.'}, 401);
    if (!await insert('wallet-used-' + challenge.id, {used:Date.now()})) return reply({error:'This sign-in request was already used. Connect again.'}, 409);
    const session = {kind:'session', id:data.accountId, accountId:data.accountId, network:'mainnet', expires:Date.now() + 86400000};
    return reply({session:{id:session.id, accountId:session.accountId, network:session.network, expires:session.expires}}, 200, sessionCookie(request, session));
  } catch {
    const configured = process.env.FIELDWORK_SESSION_SECRET?.length >= 32;
    return reply({error:configured ? 'Wallet verification is temporarily unavailable. Please try again.' : 'Wallet sign-in is awaiting server configuration.'}, 503);
  }
}
