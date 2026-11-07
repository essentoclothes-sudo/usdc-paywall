'use strict';
// usdc-paywall: verify on-chain USDC (ERC-20 Transfer) payments. Zero deps.
const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const CHAINS = {
  base: { rpc: 'https://base.publicnode.com', usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', id: 8453 },
  polygon: { rpc: 'https://polygon-rpc.com', usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', id: 137 },
};

async function rpc(chain, method, params) {
  const res = await fetch(CHAINS[chain].rpc, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

const padAddr = (a) => '0x' + a.replace(/^0x/, '').toLowerCase().padStart(64, '0');

// Verify txHash paid >= amount USDC to wallet. Returns {paid, amount, from, to, block, ok}
async function verifyPayment({ txHash, wallet, amount, chain = 'base', confirmations = 2 }) {
  try {
  const ch = CHAINS[chain] || chain;
  const receipt = await rpc(chain, 'eth_getTransactionReceipt', [txHash]);
  if (!receipt || receipt.status !== '0x1') return { ok: false, reason: 'tx not found or failed' };
  const usdc = (ch.usdc || chain.usdc).toLowerCase();
  const want = padAddr(wallet);
  let paid = 0n; let from = null;
  for (const log of receipt.logs || []) {
    if (log.topics[0] !== TRANSFER) continue;
    if (log.address.toLowerCase() !== usdc) continue;
    if (log.topics[2] && log.topics[2].toLowerCase() !== want) continue;
    paid += BigInt(log.data);
    if (!from) from = '0x' + log.topics[1].slice(26);
  }
  const needed = BigInt(Math.round(amount * 1e6)); // USDC has 6 decimals
  const head = BigInt(await rpc(chain, 'eth_blockNumber', []));
  const depth = head - BigInt(receipt.blockNumber);
  return {
    ok: paid >= needed && depth >= BigInt(confirmations),
    paidUsdc: Number(paid) / 1e6,
    amountUsdc: amount, from, block: Number(receipt.blockNumber),
    confirmations: Number(depth),
  };
  } catch (e) {
    return { ok: false, reason: 'rpc_error: ' + e.message };
  }
}

module.exports = { verifyPayment, CHAINS };
