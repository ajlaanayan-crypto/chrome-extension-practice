const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

function generateLogo(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Gradient Background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#10b981');
  gradient.addColorStop(1, '#059669');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.25);
  ctx.fill();

  // Draw Letter 'A' Emblem
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(size * 0.6)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', size / 2, size / 2 + size * 0.03);

  return canvas.toBuffer('image/png');
}

const iconsDir = path.join(__dirname, '../icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  try {
    const buffer = generateLogo(size);
    fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), buffer);
    console.log(`Generated icon-${size}.png successfully`);
  } catch (err) {
    console.warn(`Canvas module fallback for size ${size}:`, err.message);
  }
});
