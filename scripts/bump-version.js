/**
 * 打包前自动将补丁版本 +1，并同步 package-lock.json。
 * 例如：1.0.6 -> 1.0.7
 */
const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function bumpPatch(version) {
  const parts = String(version || '0.0.0').split('.').map((part) => parseInt(part, 10) || 0);
  while (parts.length < 3) {
    parts.push(0);
  }
  parts[2] += 1;
  return parts.slice(0, 3).join('.');
}

const rootDir = path.join(__dirname, '..');
const pkgPath = path.join(rootDir, 'package.json');
const lockPath = path.join(rootDir, 'package-lock.json');

const pkg = readJson(pkgPath);
const nextVersion = bumpPatch(pkg.version);
pkg.version = nextVersion;
writeJson(pkgPath, pkg);

if (fs.existsSync(lockPath)) {
  const lock = readJson(lockPath);
  lock.version = nextVersion;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = nextVersion;
  }
  writeJson(lockPath, lock);
}

console.log('Version bumped to:', nextVersion);
