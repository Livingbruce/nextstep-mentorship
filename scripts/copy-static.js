const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'frontend', 'dist');
const dest = path.join(__dirname, '..', '.vercel', 'output', 'static');

if (!fs.existsSync(src)) {
  console.error(`Source directory not found: ${src}`);
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true, force: true });

console.log(`Copied static assets from ${src} to ${dest}`);

