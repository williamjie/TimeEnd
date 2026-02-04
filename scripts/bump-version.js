/**
 * 打包前将 package.json 的 version 的 patch 位 +1（如 1.0.0 -> 1.0.1）
 */
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const parts = pkg.version.split('.').map(Number);
if (parts.length < 3) {
  parts.push(0);
}
parts[2] = (parts[2] || 0) + 1;
pkg.version = parts.join('.');
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('Version bumped to:', pkg.version);
