/**
 * Code 128B Barcode SVG Generator
 * Pure TypeScript implementation - no external dependencies.
 */

// Code 128 bar patterns: each pattern is a string of 6 alternating bar/space widths
const CODE128_PATTERNS: number[][] = [
  [2,1,2,2,2,2], // 0
  [2,2,2,1,2,2], // 1
  [2,2,2,2,2,1], // 2
  [1,2,1,2,2,3], // 3
  [1,2,1,3,2,2], // 4
  [1,3,1,2,2,2], // 5
  [1,2,2,2,1,3], // 6
  [1,2,2,3,1,2], // 7
  [1,3,2,2,1,2], // 8
  [2,2,1,2,1,3], // 9
  [2,2,1,3,1,2], // 10
  [2,3,1,2,1,2], // 11
  [1,1,2,2,3,2], // 12
  [1,2,2,1,3,2], // 13
  [1,2,2,2,3,1], // 14
  [1,1,3,2,2,2], // 15
  [1,2,3,1,2,2], // 16
  [1,2,3,2,2,1], // 17
  [2,2,3,2,1,1], // 18
  [2,2,1,1,3,2], // 19
  [2,2,1,2,3,1], // 20
  [2,1,3,2,1,2], // 21
  [2,2,3,1,1,2], // 22
  [3,1,2,1,3,1], // 23
  [3,1,1,2,2,2], // 24
  [3,2,1,1,2,2], // 25
  [3,2,1,2,2,1], // 26
  [3,1,2,2,1,2], // 27
  [3,2,2,1,1,2], // 28
  [3,2,2,2,1,1], // 29
  [2,1,2,1,2,3], // 30
  [2,1,2,3,2,1], // 31
  [2,3,2,1,2,1], // 32
  [1,1,1,3,2,3], // 33
  [1,3,1,1,2,3], // 34
  [1,3,1,3,2,1], // 35
  [1,1,2,3,1,3], // 36
  [1,3,2,1,1,3], // 37
  [1,3,2,3,1,1], // 38
  [2,1,1,3,1,3], // 39
  [2,3,1,1,1,3], // 40
  [2,3,1,3,1,1], // 41
  [1,1,2,1,3,3], // 42
  [1,1,2,3,3,1], // 43
  [1,3,2,1,3,1], // 44
  [1,1,3,1,2,3], // 45
  [1,1,3,3,2,1], // 46
  [1,3,3,1,2,1], // 47
  [3,1,3,1,2,1], // 48
  [2,1,1,3,3,1], // 49
  [2,3,1,1,3,1], // 50
  [2,1,3,1,1,3], // 51
  [2,1,3,3,1,1], // 52
  [2,1,3,1,3,1], // 53
  [3,1,1,1,2,3], // 54
  [3,1,1,3,2,1], // 55
  [3,3,1,1,2,1], // 56
  [3,1,2,1,1,3], // 57
  [3,1,2,3,1,1], // 58
  [3,3,2,1,1,1], // 59
  [3,1,4,1,1,1], // 60
  [2,2,1,4,1,1], // 61
  [4,3,1,1,1,1], // 62
  [1,1,1,2,2,4], // 63
  [1,1,1,4,2,2], // 64
  [1,2,1,1,2,4], // 65
  [1,2,1,4,2,1], // 66
  [1,4,1,1,2,2], // 67
  [1,4,1,2,2,1], // 68
  [1,1,2,2,1,4], // 69
  [1,1,2,4,1,2], // 70
  [1,2,2,1,1,4], // 71
  [1,2,2,4,1,1], // 72
  [1,4,2,1,1,2], // 73
  [1,4,2,2,1,1], // 74
  [2,4,1,2,1,1], // 75
  [2,2,1,1,1,4], // 76
  [4,1,3,1,1,1], // 77
  [2,4,1,1,1,2], // 78
  [1,3,4,1,1,1], // 79
  [1,1,1,2,4,2], // 80
  [1,2,1,1,4,2], // 81
  [1,2,1,2,4,1], // 82
  [1,1,4,2,1,2], // 83
  [1,2,4,1,1,2], // 84
  [1,2,4,2,1,1], // 85
  [4,1,1,2,1,2], // 86
  [4,2,1,1,1,2], // 87
  [4,2,1,2,1,1], // 88
  [2,1,2,1,4,1], // 89
  [2,1,4,1,2,1], // 90
  [4,1,2,1,2,1], // 91
  [1,1,1,1,4,3], // 92
  [1,1,1,3,4,1], // 93
  [1,3,1,1,4,1], // 94
  [1,1,4,1,1,3], // 95
  [1,1,4,3,1,1], // 96
  [4,1,1,1,1,3], // 97
  [4,1,1,3,1,1], // 98
  [1,1,3,1,4,1], // 99
  [1,1,4,1,3,1], // 100
  [3,1,1,1,4,1], // 101
  [4,1,1,1,3,1], // 102
  [2,1,1,4,1,2], // 103 START A
  [2,1,1,2,1,4], // 104 START B
  [2,1,1,2,3,2], // 105 START C
  [2,3,3,1,1,1,2], // 106 STOP (7 elements)
];

const START_B = 104;
const STOP = 106;

function encodeCode128B(text: string): number[] {
  const codes: number[] = [START_B];

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    // Code 128B maps ASCII 32-127 to values 0-95
    const value = charCode - 32;
    if (value < 0 || value > 95) {
      // Replace unsupported characters with space (value 0)
      codes.push(0);
    } else {
      codes.push(value);
    }
  }

  // Calculate checksum
  let checksum = codes[0]; // start code value
  for (let i = 1; i < codes.length; i++) {
    checksum += i * codes[i];
  }
  checksum = checksum % 103;
  codes.push(checksum);
  codes.push(STOP);

  return codes;
}

function patternToBars(pattern: number[]): boolean[] {
  const bars: boolean[] = [];
  for (let i = 0; i < pattern.length; i++) {
    const width = pattern[i];
    const isBar = i % 2 === 0; // even indices are bars, odd are spaces
    for (let j = 0; j < width; j++) {
      bars.push(isBar);
    }
  }
  return bars;
}

/**
 * Generate a Code 128B barcode as an SVG string.
 * @param text - The text to encode in the barcode
 * @param width - Total SVG width in pixels (default: 200)
 * @param height - Bar height in pixels (default: 60)
 * @returns SVG markup string
 */
export function generateBarcodeSVG(text: string, width = 200, height = 60): string {
  if (!text) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + 20}"><text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-family="monospace" font-size="12">No code</text></svg>`;
  }

  const codes = encodeCode128B(text);

  // Convert code values to bar patterns
  const allBars: boolean[] = [];

  // Quiet zone (10 modules of space)
  for (let i = 0; i < 10; i++) allBars.push(false);

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    if (pattern) {
      allBars.push(...patternToBars(pattern));
    }
  }

  // Quiet zone
  for (let i = 0; i < 10; i++) allBars.push(false);

  const totalModules = allBars.length;
  const moduleWidth = width / totalModules;
  const totalHeight = height + 22; // extra space for text label

  let rects = '';
  for (let i = 0; i < allBars.length; i++) {
    if (allBars[i]) {
      const x = (i * moduleWidth).toFixed(2);
      const w = moduleWidth.toFixed(2);
      rects += `<rect x="${x}" y="0" width="${w}" height="${height}" fill="#000"/>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}">
  <rect width="${width}" height="${totalHeight}" fill="#fff"/>
  ${rects}
  <text x="${width / 2}" y="${height + 16}" text-anchor="middle" font-family="monospace" font-size="13" fill="#000">${escapeXml(text)}</text>
</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generate a printable HTML page with barcodes in a grid layout.
 * Each card contains the product name, price, and barcode.
 */
export function generateBarcodesPrintHTML(
  products: { code: string; name: string; prixDetail: number }[],
  formatPrice: (n: number) => string
): string {
  const cards = products
    .map(
      (p) => `
    <div class="barcode-card">
      <div class="barcode-name">${escapeXml(p.name)}</div>
      <div class="barcode-price">${escapeXml(formatPrice(p.prixDetail))}</div>
      <div class="barcode-svg">${generateBarcodeSVG(p.code, 180, 50)}</div>
    </div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Codes-barres - 100PLUS SHOP</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; padding: 10mm; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(55mm, 1fr));
    gap: 5mm;
  }
  .barcode-card {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 3mm;
    text-align: center;
    page-break-inside: avoid;
  }
  .barcode-name {
    font-size: 10px;
    font-weight: bold;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .barcode-price {
    font-size: 12px;
    font-weight: bold;
    color: #333;
    margin-bottom: 4px;
  }
  .barcode-svg svg {
    max-width: 100%;
    height: auto;
  }
  @media print {
    body { padding: 5mm; }
    .barcode-card { border: 1px solid #999; }
  }
</style>
</head>
<body>
<div class="grid">
${cards}
</div>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}
