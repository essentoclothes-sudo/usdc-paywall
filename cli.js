#!/usr/bin/env node
'use strict';
const { verifyPayment } = require('./index.js');
const { verifyLicense, watchPayments } = require('./pro.js');
const a = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };

(async () => {
  const cmd = process.argv[2];
  if (cmd === 'pro') {
    const sub = process.argv[3];
    if (sub === 'verify') {
      const key = a('--key');
      if (!key) { console.error('uso: usdc-paywall pro verify --key LICENSE'); process.exit(2); }
      const r = verifyLicense(key);
      console.log(JSON.stringify(r));
      process.exit(r.valid ? 0 : 1);
    }
    if (sub === 'watch') {
      const lic = a('--license') || process.env.USDC_PAYWALL_LICENSE;
      const wallet = a('--to'); const chain = a('--chain') || 'base';
      if (!lic || !wallet) { console.error('uso: usdc-paywall pro watch --to WALLET --license KEY [--chain base]'); process.exit(2); }
      const v = verifyLicense(lic);
      if (!v.valid) { console.error('licencia invalida'); process.exit(4); }
      console.error('licencia OK (' + v.buyer + ') — vigilando ' + wallet + ' en ' + chain);
      try {
        for await (const p of watchPayments({ wallet, chain }, lic)) console.log(JSON.stringify(p));
      } catch (e) { console.error(String(e.message || e)); process.exit(3); }
    }
    console.error('uso: usdc-paywall pro verify|watch …'); process.exit(2);
  }

  const txHash = a('--tx'); const wallet = a('--to'); const amount = Number(a('--amount') || 0);
  const chain = a('--chain') || 'base';
  if (!txHash || !wallet || !amount) { console.error('uso: usdc-paywall --tx HASH --to WALLET --amount 3 [--chain base]  |  usdc-paywall pro …'); process.exit(2); }
  try {
    const r = await verifyPayment({ txHash, wallet, amount, chain });
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.ok ? 0 : 1);
  } catch (e) { console.error(String(e.message || e)); process.exit(3); }
})();
