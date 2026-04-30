#!/usr/bin/env node
// Generates an Apple Sign in with Apple client secret JWT (valid 6 months).
// Re-run every 6 months and update the Secret Key in Supabase.
//
// Usage:
//   node UI-IOS/Scripts/generate-apple-secret.js
//
// Requirements: Node.js 15+ (uses built-in crypto — no npm install needed)

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const TEAM_ID     = 'T6GYVDW7V2';
const KEY_ID      = '65USX85UF3';        // replace with your Sign in with Apple Key ID
const SERVICES_ID = 'com.byteai.auth';
const P8_PATH     = `${process.env.HOME}/Documents/ios/auth/AuthKey_65USX85UF3.p8`;
// ─────────────────────────────────────────────────────────────────────────────

const privateKey = fs.readFileSync(path.resolve(P8_PATH), 'utf8');
const now = Math.floor(Date.now() / 1000);

const header  = Buffer.from(JSON.stringify({ alg: 'ES256', kid: KEY_ID })).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  iss: TEAM_ID,
  iat: now,
  exp: now + 15777000, // 6 months
  aud: 'https://appleid.apple.com',
  sub: SERVICES_ID,
})).toString('base64url');

const signingInput = `${header}.${payload}`;
const sign = crypto.createSign('SHA256');
sign.update(signingInput);
const signature = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');

const jwt = `${signingInput}.${signature}`;
console.log('\nGenerated client secret JWT (paste into Supabase → Apple provider → Secret Key):\n');
console.log(jwt);
console.log(`\nExpires: ${new Date((now + 15777000) * 1000).toLocaleDateString()}\n`);
