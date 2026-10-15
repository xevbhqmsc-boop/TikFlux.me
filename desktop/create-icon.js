const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

(async () => {
  const src = path.join(__dirname, '..', 'tiktok-logo.png');
  const out = path.join(__dirname, 'build-resources', 'icon.ico');

  try {
    const image = await Jimp.read(src);
    image.resize({ w: 256, h: 256 });
    
    const sizes = [16, 32, 48, 64, 128, 256];
    const images = [];
    
    for (const size of sizes) {
      const img = image.clone();
      img.resize({ w: size, h: size });
      const pngBuf = await img.getBuffer('image/png');
      images.push({ size, buf: pngBuf });
    }
    
    const headerSize = 6;
    const entrySize = 16;
    const entries = images.length;
    
    let dataOffset = headerSize + entrySize * entries;
    
    const entriesBuf = Buffer.alloc(entrySize * entries);
    const dataBuffers = [];
    
    for (let i = 0; i < images.length; i++) {
      const { size, buf } = images[i];
      const entry = entriesBuf.subarray(i * entrySize, (i + 1) * entrySize);
      
      entry[0] = size === 256 ? 0 : size;
      entry[1] = size === 256 ? 0 : size;
      entry[2] = 0;
      entry[3] = 0;
      entry.writeUInt16LE(1, 4);
      entry.writeUInt16LE(32, 6);
      entry.writeUInt32LE(buf.length, 8);
      entry.writeUInt32LE(dataOffset, 12);
      
      dataBuffers.push(buf);
      dataOffset += buf.length;
    }
    
    const icoHeader = Buffer.alloc(6);
    icoHeader.writeUInt16LE(0, 0);
    icoHeader.writeUInt16LE(1, 2);
    icoHeader.writeUInt16LE(entries, 4);
    
    const ico = Buffer.concat([icoHeader, entriesBuf, ...dataBuffers]);
    fs.writeFileSync(out, ico);
    
    console.log('Created icon.ico, size:', ico.length, 'bytes');
  } catch(e) {
    console.error('Error:', e.message);
  }
})();
