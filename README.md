# usdc-paywall

**Crypto-native paywall for Node.** Verify that a USDC payment hit your wallet on Base or Polygon — by tx hash — and unlock content. No Stripe, no accounts, no KYC. You run the wallet.

    const { verifyPayment } = require('@josealbertomaquina/usdc-paywall')
    const r = await verifyPayment({ txHash: '0x…', wallet: '0x82d1…', amount: 3, chain: 'base' })
    if (r.ok) res.send(secretContent)      // paid ≥ 3 USDC (confirmed)
    else res.status(402).send(r)           // Payment Required

CLI (exit 0 = paid):

    usdc-paywall --tx 0x… --to 0x82d1… --amount 3 --chain base

- ERC-20 Transfer log check against official USDC contracts (Base, Polygon)
- 6-decimals math with BigInt, confirmation-depth guard, zero dependencies
- Use it for: paid APIs, license keys, agent-to-agent services (x402-style flows)
