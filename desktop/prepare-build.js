const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Try to use sharp if available, otherwise create a minimal ICO from the PNG
const src = path.join(__dirname, '..', 'tiktok-logo.png');
const out = path.join(__dirname, 'build-resources', 'icon.ico');

// electron-builder can use .png on Windows too for the app icon
// For NSIS it needs .ico but we can skip it and use png
// Let's just copy the png as icon.png for now
const pngOut = path.join(__dirname, 'build-resources', 'icon.png');
fs.copyFileSync(src, pngOut);
console.log('Copied PNG icon to', pngOut);

// Also try to generate a minimal ICO
// ICO format: header(6) + entry(16) + bitmap data
try {
  // Use ImageMagick if available
  execSync(`magick "${src}" -resize 256x256 "${out}"`, { stdio: 'pipe' });
  console.log('Created ICO with ImageMagick');
} catch(e) {
  try {
    execSync(`convert "${src}" -resize 256x256 "${out}"`, { stdio: 'pipe' });
    console.log('Created ICO with convert');
  } catch(e2) {
    console.log('No ImageMagick available, using PNG for electron-builder');
    console.log('electron-builder v25+ can convert PNG to ICO automatically');
  }
}
