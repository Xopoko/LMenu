const { spawnSync } = require('child_process');
const path = require('path');
const webpackPath = path.join(__dirname, 'node_modules', '.bin', 'webpack');

function fileExists(filePath){
  try {
    require('fs').accessSync(filePath);
    return true;
  } catch (_) {
    return false;
  }
}

if (!fileExists(webpackPath)) {
  console.log('webpack not found, skipping build.');
  process.exit(0);
}

const result = spawnSync(webpackPath, { stdio: 'inherit' });
process.exit(result.status);
