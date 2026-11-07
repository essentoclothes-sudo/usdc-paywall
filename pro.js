'use strict';
// usdc-paywall Pro: license keys (Ed25519) + live payment watching. Zero deps.
const crypto = require('crypto');
const { CHAINS } = require('./index.js');

const PRO_PUBKEY_B64U = 'MCowBQYDK2VwAyEA-3ujNYYDAV5gxsXBwwvsvrG3JyN0o9e9PmwL9BNYGf8';
const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Issue a license (offline, needs the Ed25519 private key). Format: base64url(payload).base64url(sig)
function issueLicense({ buyer, privateKeyB64U, product = 'usdc-paywall-pro' }) {
  const priv = crypto.createPrivateKey({ key: Buffer.from(privateKeyB64U, 'base64url'), format: 'der', type: 'pkcs8' });
  const payload = JSON.stringify({ p: product, b: String(buyer), t: Date.now() });
  const sig = crypto.sign(null, Buffer.from(payload, 'utf8'), priv).toString('base64url');
  return Buffer.from(payload, 'utf8').toString('base64url') + '.' + sig;
}

// Verify a license key. Returns { valid, buyer, issuedAt } or { valid: false }
function verifyLicense(key, pubB64U = PRO_PUBKEY_B64U) {
  try {
    const [payload, sig] = String(key).trim().split('.');
    if (!payload || !sig) return { valid: false };
    const pub = crypto.createPublicKey({ key: Buffer.from(pubB64U, 'base64url'), format: 'der', type: 'spki' });
    const orig = Buffer.from(payload, 'base64url').toString('utf8'); // sign covers the original JSON, not its encoding
    if (!crypto.verify(null, Buffer.from(orig, 'utf8'), pub, Buffer.from(sig, 'base64url'))) return { valid: false };
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.p !== 'usdc-paywall-pro') return { valid: false };
    return { valid: true, buyer: data.b, issuedAt: data.t };
  } catch { return { valid: false }; }
}

async function rpc(ch, method, params) {
  const res = await fetch(ch.rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}
const hex = (n) => '0x' + BigInt(n).toString(16);

// Live watch for incoming USDC transfers to a wallet (Pro, requires a valid license).
// Yields { txHash, amountUsdc, from, blockNumber } as payments land on-chain.
async function* watchPayments({ wallet, chain = 'base', intervalMs = 15000, fromBlock = 'latest' }, licenseKey) {
  const v = verifyLicense(licenseKey || '');
  if (!v.valid) throw new Error('Pro feature: valid license required (usdc-paywall pro verify --key …)');
  const ch = CHAINS[chain];
  const toTopic = '0x' + wallet.replace(/^0x/, '').toLowerCase().padStart(64, '0');
  let last = fromBlock === 'latest' ? await rpc(ch, 'eth_blockNumber', []) : fromBlock;
  for (;;) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const head = await rpc(ch, 'eth_blockNumber', []);
    if (BigInt(head) <= BigInt(last)) continue;
    const logs = await rpc(ch, 'eth_getLogs', [{ fromBlock: hex(last), toBlock: head, address: ch.usdc, topics: [TRANSFER, null, toTopic] }]);
    for (const log of logs) {
      yield { txHash: log.transactionHash, amountUsdc: Number(BigInt(log.data)) / 1e6, from: '0x' + log.topics[1].slice(26), blockNumber: parseInt(log.blockNumber, 16) };
    }
    last = head;
  }
}

module.exports = { issueLicense, verifyLicense, watchPayments, PRO_PUBKEY_B64U };
