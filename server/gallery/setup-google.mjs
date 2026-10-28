import http from 'node:http';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, access } from 'node:fs/promises';
import { APP_TAG, SCOPE } from './config.mjs';

// Run on the owner's computer, never as an Internet-facing authorization service.
const credentialsPath = process.env.GOOGLE_OAUTH_CREDENTIALS;
if (!credentialsPath) throw new Error('Set GOOGLE_OAUTH_CREDENTIALS to the downloaded Desktop OAuth client JSON.');
const outputFile = process.env.GOOGLE_SETUP_ENV_FILE || new URL('./.env', import.meta.url);
try { await access(outputFile); throw new Error('The setup output file already exists; choose a new GOOGLE_SETUP_ENV_FILE or reuse its secrets.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const credentials = JSON.parse(await readFile(credentialsPath, 'utf8')).installed;
if (!credentials?.client_id || !credentials.client_secret) throw new Error('Use a Desktop app OAuth client JSON.');
const state = randomBytes(32).toString('base64url'), verifier = randomBytes(48).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
let resolveCode, rejectCode;
const callback = new Promise((resolve, reject) => { resolveCode = resolve; rejectCode = reject; });
const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  const supplied = Buffer.from(url.searchParams.get('state') || ''), expected = Buffer.from(state);
  if (url.pathname !== '/oauth2/callback' || supplied.length !== expected.length || !timingSafeEqual(supplied, expected) || !url.searchParams.get('code')) {
    response.writeHead(400); response.end('Invalid authorization response.'); return;
  }
  response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end('Google Drive authorization received. You may close this tab.'); resolveCode(url.searchParams.get('code'));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const timeout = setTimeout(() => rejectCode(new Error('Authorization timed out. Run setup again.')), 300_000);
const redirectUri = `http://127.0.0.1:${server.address().port}/oauth2/callback`;
const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authorization.search = new URLSearchParams({ client_id: credentials.client_id, redirect_uri: redirectUri, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'false', state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
console.log('Owner: open this address locally and authorize ONLY your wedding Google account:');
console.log(authorization.href);
try {
  const code = await callback;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: credentials.client_id, client_secret: credentials.client_secret, code, code_verifier: verifier, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    signal: AbortSignal.timeout(20_000), redirect: 'error'
  });
  const tokens = await response.json();
  if (!response.ok || !tokens.refresh_token) throw new Error('Google did not return a refresh token. Check the owner authorization.');
  if (tokens.scope?.split(' ').some(scope => scope !== SCOPE)) throw new Error('Refusing broader scopes. Create a dedicated OAuth client with only drive.file.');
  const folderResponse = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST', headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: process.env.GOOGLE_FOLDER_NAME || 'Simona & Martin – svadobné fotografie', mimeType: 'application/vnd.google-apps.folder', appProperties: { gallery: APP_TAG } }),
    signal: AbortSignal.timeout(20_000), redirect: 'error'
  });
  const folder = await folderResponse.json();
  if (!folderResponse.ok || !folder.id) throw new Error('Unable to create the dedicated private wedding folder.');
  const envLine = (name, value) => `${name}=${JSON.stringify(String(value))}`;
  const contents = [
    envLine('GOOGLE_CLIENT_ID', credentials.client_id), envLine('GOOGLE_CLIENT_SECRET', credentials.client_secret),
    envLine('GOOGLE_REFRESH_TOKEN', tokens.refresh_token), envLine('GOOGLE_DRIVE_FOLDER_ID', folder.id),
    'ALLOWED_ORIGINS=https://samsvadba.github.io', 'PUBLIC_API_URL=https://YOUR-GALLERY-HOST/api/gallery', 'PORT=8080', 'HOST=0.0.0.0', 'TRUST_PROXY_HOPS=0'
  ].join('\n') + '\n';
  // Never print tokens or accidentally replace an existing working installation.
  await writeFile(outputFile, contents, { flag: 'wx', mode: 0o600 });
  console.log('Created the private folder and local secret environment file. Put its values into hosting secrets; set PUBLIC_API_URL. Keep this file private and never commit it.');
} finally { clearTimeout(timeout); server.close(); }
