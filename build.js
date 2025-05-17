const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const webpackPath = path.join(__dirname, 'node_modules', '.bin', 'webpack');

function fileExists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch (_) {
    return false;
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fileExists(webpackPath)) {
  console.log('webpack not found, copying source files to dist.');
  const distDir = path.join(__dirname, 'dist');
  copyDir(path.join(__dirname, 'src'), distDir);
  process.exit(0);
}

const result = spawnSync(webpackPath, { stdio: 'inherit' });
process.exit(result.status);
