import {createHash, createPublicKey, verify} from 'node:crypto';

function decodeBase58(text) {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let value = 0n;
  for (const char of text) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw Error('Invalid public key.');
    value = value * 58n + BigInt(digit);
  }
  const bytes = [];
  while (value > 0n) { bytes.unshift(Number(value & 255n)); value >>= 8n; }
  for (const char of text) { if (char !== '1') break; bytes.unshift(0); }
  return Buffer.from(bytes);
}

function borshString(value) {
  const bytes = Buffer.from(value, 'utf8');
  const length = Buffer.alloc(4);
  length.writeUInt32LE(bytes.length);
  return Buffer.concat([length, bytes]);
}

export function nep413Digest(challenge) {
  const tag = Buffer.alloc(4);
  tag.writeUInt32LE(2147484061);
  const payload = Buffer.concat([
    tag, borshString(challenge.message), Buffer.from(challenge.nonce, 'base64'),
    borshString(challenge.recipient), Buffer.from([1]), borshString(challenge.callbackUrl)
  ]);
  return createHash('sha256').update(payload).digest();
}

export function verifyWalletSignature(challenge, publicKey, signature) {
  if (typeof publicKey !== 'string' || !/^ed25519:[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(publicKey)) return false;
  if (typeof signature !== 'string' || !/^[A-Za-z0-9+/]{86}==$/.test(signature)) return false;
  try {
    const keyBytes = decodeBase58(publicKey.slice(8));
    const signatureBytes = Buffer.from(signature, 'base64');
    if (keyBytes.length !== 32 || signatureBytes.length !== 64) return false;
    const key = createPublicKey({format:'der', type:'spki', key:Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), keyBytes])});
    return verify(null, nep413Digest(challenge), key, signatureBytes);
  } catch { return false; }
}

export async function accountHasFullAccessKey(accountId, publicKey) {
  const response = await fetch(process.env.NEAR_RPC_URL || 'https://rpc.mainnet.near.org', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0', id:'fieldwork-wallet', method:'query', params:{request_type:'view_access_key', finality:'final', account_id:accountId, public_key:publicKey}}),
    signal:AbortSignal.timeout(10000), cache:'no-store'
  });
  if (!response.ok) throw Error('NEAR account verification is temporarily unavailable.');
  const result = await response.json();
  return result.result?.permission === 'FullAccess';
}
