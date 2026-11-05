#!/usr/bin/env node
'use strict';
const { verifyPayment } = require('./index.js');
const a = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
(async () => {
  const txHash = a('--tx'); const wallet = a('--to'); const amount = Number(a('--amount') || 0);
  const chain = a('--chain') || 'base';
  if (!txHash || !wallet || !amount) { console.error('uso: usdc-paywall --tx HASH --to WALLET --amount 3 [--chain base]'); process.exit(2); }
  try {
    const r = await verifyPayment({ txHash, wallet, amount, chain });
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.ok ? 0 : 1);
  } catch (e) { console.error(String(e.message || e)); process.exit(3); }
})();
