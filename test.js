'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const { verifyPayment, CHAINS } = require('./index.js');

const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const FROM = '0x1111111111111111111111111111111111111111';
const WALLET = '0x2222222222222222222222222222222222222222';
const padAddr = (a) => '0x' + a.replace(/^0x/, '').toLowerCase().padStart(64, '0');
const hex = (n) => '0x' + n.toString(16);

function log(usdc, raw, to, from = FROM) {
  return { address: usdc, topics: [TRANSFER, padAddr(from), padAddr(to)], data: hex(raw) };
}
function receipt(logs, { status = '0x1', block = 100 } = {}) {
  return { status, blockNumber: hex(block), logs };
}
// Mock del RPC: intercepta fetch global y responde por método.
function withRpc(handlers, fn) {
  const orig = globalThis.fetch;
  globalThis.fetch = async (_url, opts) => {
    const body = JSON.parse(opts.body);
    const result = handlers[body.method] ? handlers[body.method](body.params) : null;
    return { json: async () => ({ jsonrpc: '2.0', id: 1, result }) };
  };
  return Promise.resolve(fn()).finally(() => { globalThis.fetch = orig; });
}
const usdc = CHAINS.base.usdc;
const base = { wallet: WALLET, amount: 3, chain: 'base' };
const ok = (logs, extra = {}, hs = {}) => withRpc({
  eth_getTransactionReceipt: () => receipt(logs, extra),
  eth_blockNumber: () => hex(110),
  ...hs,
}, () => verifyPayment(base));

test('CHAINS expone base y polygon con id y USDC correctos', () => {
  assert.equal(CHAINS.base.id, 8453);
  assert.equal(CHAINS.polygon.id, 137);
  assert.match(CHAINS.base.usdc, /^0x[0-9a-fA-F]{40}$/);
  assert.match(CHAINS.polygon.usdc, /^0x[0-9a-fA-F]{40}$/);
});

test('pago exacto con confirmaciones -> ok', async () => {
  const r = await ok([log(usdc, 3_000_000n, WALLET)]);
  assert.equal(r.ok, true);
  assert.equal(r.paidUsdc, 3);
  assert.equal(r.amountUsdc, 3);
  assert.equal(r.from, FROM);
  assert.equal(r.block, 100);
  assert.equal(r.confirmations, 10);
});

test('pago por encima del importe -> ok', async () => {
  const r = await ok([log(usdc, 4_500_000n, WALLET)]);
  assert.equal(r.ok, true);
  assert.equal(r.paidUsdc, 4.5);
});

test('varios transfers al mismo wallet se acumulan', async () => {
  const r = await ok([log(usdc, 500_000n, WALLET), log(usdc, 2_600_000n, WALLET)]);
  assert.equal(r.ok, true);
  assert.equal(r.paidUsdc, 3.1);
});

test('importe insuficiente -> no ok', async () => {
  const r = await ok([log(usdc, 2_999_999n, WALLET)]);
  assert.equal(r.ok, false);
  assert.equal(r.paidUsdc, 2.999999);
});

test('transfer a otro wallet se ignora', async () => {
  const other = '0x9999999999999999999999999999999999999999';
  const r = await ok([log(usdc, 3_000_000n, other)]);
  assert.equal(r.ok, false);
  assert.equal(r.paidUsdc, 0);
  assert.equal(r.from, null);
});

test('token distinto de USDC se ignora', async () => {
  const fake = '0x' + 'ab'.repeat(20);
  const r = await ok([log(fake, 3_000_000n, WALLET)]);
  assert.equal(r.ok, false);
});

test('tx fallida (status 0x0) -> reason', async () => {
  const r = await ok([log(usdc, 3_000_000n, WALLET)], { status: '0x0' });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'tx not found or failed');
});

test('receipt inexistente -> reason', async () => {
  const r = await ok([], {}, { eth_getTransactionReceipt: () => null });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'tx not found or failed');
});

test('confirmaciones insuficientes -> no ok aunque pagado', async () => {
  const r = await ok([log(usdc, 3_000_000n, WALLET)], { block: 110 });
  assert.equal(r.ok, false);
  assert.equal(r.paidUsdc, 3);
  assert.equal(r.confirmations, 0);
});

test('CLI sin argumentos sale con codigo 2 (uso)', () => {
  const r = spawnSync(process.execPath, ['cli.js'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /uso:/);
});
