const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
const env = Object.fromEntries(envText.split(/\r?\n/).filter(line => /^VITE_CLOUDINARY_/.test(line)).map(line => {
  const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')];
}));
const cloudName = env.VITE_CLOUDINARY_CLOUD_NAME;
if (!/^[a-z0-9_-]{1,100}$/.test(cloudName || '') || cloudName === 'not-configured' || !/^[\w-]{1,200}$/.test(env.VITE_CLOUDINARY_UPLOAD_PRESET || '')) {
  console.error('Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env.local first.');
  process.exit(1);
}
const rulesPath = path.join(root, 'firestore.rules');
const rules = fs.readFileSync(rulesPath, 'utf8');
const pattern = /function cloudinaryCloudName\(\) \{ return '[^']*'; \}/;
if (!pattern.test(rules)) throw new Error('Cloudinary rule marker was not found. No files changed.');
fs.writeFileSync(rulesPath, rules.replace(pattern, `function cloudinaryCloudName() { return '${cloudName}'; }`));
console.log('Firestore Rules now allow images from Cloudinary cloud: ' + cloudName);
console.log('Next: npx firebase deploy --only firestore:rules --project qrcode-47974');
