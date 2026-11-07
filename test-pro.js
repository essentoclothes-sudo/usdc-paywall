'use strict';
const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { spawnSync } = require('node:child_process');
const { issueLicense, verifyLicense, watchPayments, PRO_PUBKEY_B64U } = require('./pro.js');

// Ephemeral keypair so tests don't need the real private key.
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const pub = publicKey.export({ type: 'spki', format: 'der' }).toString('base64url');
const priv = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64url');

test('issue + verify roundtrip', () => {
  const key = issueLicense({ buyer: 'alice', privateKeyB64U: priv });
  const v = verifyLicense(key, pub);
  assert.equal(v.valid, true);
  assert.equal(v.buyer, 'alice');
  assert.ok(v.issuedAt > 0);
});

test('tampered signature fails', () => {
  const key = issueLicense({ buyer: 'bob', privateKeyB64U: priv });
  const bad = key.slice(0, -4) + (key.endsWith('AAAA') ? 'BBBB' : 'AAAA');
  assert.equal(verifyLicense(bad, pub).valid, false);
});

test('wrong product fails', () => {
  const key = issueLicense({ buyer: 'carol', privateKeyB64U: priv, product: 'other-product' });
  assert.equal(verifyLicense(key, pub).valid, false);
});

test('garbage / empty keys fail', () => {
  assert.equal(verifyLicense('').valid, false);
  assert.equal(verifyLicense('nonsense').valid, false);
  assert.equal(verifyLicense('a.b.c', pub).valid, false);
});

test('real embedded pubkey rejects self-issued keys', () => {
  const key = issueLicense({ buyer: 'mallory', privateKeyB64U: priv });
  assert.equal(verifyLicense(key, PRO_PUBKEY_B64U).valid, false);
});

test('watchPayments requires a valid license', async () => {
  const it = watchPayments({ wallet: '0x2222222222222222222222222222222222222222' }, 'nope');
  await assert.rejects(() => it.next(), /license required/);
});

test('CLI pro verify rejects bad key with exit 1', () => {
  const r = spawnSync(process.execPath, ['cli.js', 'pro', 'verify', '--key', 'junk'], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /"valid":false/);
});
