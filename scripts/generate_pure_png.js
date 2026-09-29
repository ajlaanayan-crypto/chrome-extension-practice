const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPurePng(size, letter = 'A') {
  // Simple PNG encoder
  const width = size;
  const height = size;
  
  // Create RGBA raw buffer
  const rawData = Buffer.alloc(height * (1 + width * 4));
  
  const greenR = 16, greenG = 185, greenB = 129;
  const darkR = 5, darkG = 150, darkB = 105;
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // Filter type 0 (None)
    
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      // Gradient background
      const factor = (y + x) / (height + width);
      let r = Math.round(greenR * (1 - factor) + darkR * factor);
      let g = Math.round(greenG * (1 - factor) + darkG * factor);
      let b = Math.round(greenB * (1 - factor) + darkB * factor);
      let a = 255;

      // Draw Letter 'A' Shape
      const nx = (x - width / 2) / (width / 2);
      const ny = (y - height / 2) / (height / 2);

      // Letter A Geometry
      const legWidth = 0.25;
      const isLeftLeg = Math.abs(ny - (-2 * nx - 0.2)) < legWidth && ny > -0.6 && ny < 0.6;
      const isRightLeg = Math.abs(ny - (2 * nx - 0.2)) < legWidth && ny > -0.6 && ny < 0.6;
      const isCrossbar = ny > 0.05 && ny < 0.25 && Math.abs(nx) < 0.35;

      if ((isLeftLeg || isRightLeg || isCrossbar) && (nx * nx + ny * ny < 0.7)) {
        r = 255;
        g = 255;
        b = 255;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // Compress IDAT
  const compressedData = zlib.deflateSync(rawData);

  // Build PNG Buffer
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT Chunk
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);

  const crcBuf = Buffer.alloc(4 + len);
  buf.copy(crcBuf, 0, 4, 8 + len);
  const crc = crc32(crcBuf);
  buf.writeUInt32BE(crc, 8 + len);

  return buf;
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
  }
  return (crc ^ -1) >>> 0;
}

const iconsDir = path.join(__dirname, '../icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const pngBuf = createPurePng(size, 'A');
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), pngBuf);
  console.log(`Generated pure icon-${size}.png successfully`);
});
