const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, 'public');

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

copyRecursive(publicDir, distDir);

const appJsPath = path.join(distDir, 'app.js');
const stylesDir = path.join(distDir, 'styles');
if (!fs.existsSync(stylesDir)) {
  fs.mkdirSync(stylesDir, { recursive: true });
}

const cssPath = path.join(__dirname, 'src', 'styles', 'main.css');
const destCss = path.join(distDir, 'styles', 'main.css');
if (fs.existsSync(cssPath)) {
  fs.copyFileSync(cssPath, destCss);
}

if (!fs.existsSync(appJsPath)) {
  console.log('Build output not found; check TypeScript compilation output.');
}
