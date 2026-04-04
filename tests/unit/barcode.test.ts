import { describe, it, expect } from 'vitest';
import { generateBarcodeSVG, generateBarcodesPrintHTML } from '../../src/lib/utils/barcode';

describe('generateBarcodeSVG', () => {
  it('returns a valid SVG string containing the input text', () => {
    const svg = generateBarcodeSVG('ABC123');
    expect(svg).toContain('ABC123');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('contains <svg and <rect elements', () => {
    const svg = generateBarcodeSVG('TEST');
    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
  });

  it('handles empty string by returning an SVG with "No code" text', () => {
    const svg = generateBarcodeSVG('');
    expect(svg).toContain('<svg');
    expect(svg).toContain('No code');
    // Empty string should not produce barcode bars
    expect(svg).not.toContain('fill="#000"');
  });

  it('handles special characters by escaping XML entities', () => {
    const svg = generateBarcodeSVG('<test>&"value"');
    expect(svg).toContain('&lt;test&gt;&amp;&quot;value&quot;');
    // Should still be a valid SVG structure
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('respects custom width', () => {
    const svg = generateBarcodeSVG('HELLO', 300);
    expect(svg).toContain('width="300"');
  });

  it('respects custom height', () => {
    const svg = generateBarcodeSVG('HELLO', 200, 80);
    // The total SVG height is barHeight + 22 for the text area
    expect(svg).toContain('height="102"');
    // Individual bars should use the specified height
    expect(svg).toContain('height="80"');
  });

  it('uses default width=200 and height=60', () => {
    const svg = generateBarcodeSVG('X');
    expect(svg).toContain('width="200"');
    // Total height = 60 + 22 = 82
    expect(svg).toContain('height="82"');
  });

  it('produces bars (rect elements with fill="#000") for non-empty input', () => {
    const svg = generateBarcodeSVG('A');
    const barCount = (svg.match(/fill="#000"/g) || []).length;
    expect(barCount).toBeGreaterThan(0);
  });
});

describe('generateBarcodesPrintHTML', () => {
  const mockFormatPrice = (n: number) => `${n} FCFA`;

  it('returns HTML with DOCTYPE declaration', () => {
    const html = generateBarcodesPrintHTML(
      [{ code: 'PRD-AB12', name: 'Widget', prixDetail: 500 }],
      mockFormatPrice
    );
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('contains product names', () => {
    const html = generateBarcodesPrintHTML(
      [
        { code: 'PRD-0001', name: 'Savon Palmolive', prixDetail: 300 },
        { code: 'PRD-0002', name: 'Riz 5kg', prixDetail: 4500 },
      ],
      mockFormatPrice
    );
    expect(html).toContain('Savon Palmolive');
    expect(html).toContain('Riz 5kg');
  });

  it('contains formatted prices', () => {
    const html = generateBarcodesPrintHTML(
      [{ code: 'PRD-0001', name: 'Lait', prixDetail: 1200 }],
      mockFormatPrice
    );
    expect(html).toContain('1200 FCFA');
  });

  it('contains embedded barcode SVGs', () => {
    const html = generateBarcodesPrintHTML(
      [{ code: 'PRD-TEST', name: 'Test', prixDetail: 100 }],
      mockFormatPrice
    );
    expect(html).toContain('<svg');
    expect(html).toContain('PRD-TEST');
  });

  it('escapes special characters in product names', () => {
    const html = generateBarcodesPrintHTML(
      [{ code: 'X', name: 'Lait & Miel <bio>', prixDetail: 800 }],
      mockFormatPrice
    );
    expect(html).toContain('Lait &amp; Miel &lt;bio&gt;');
  });

  it('handles an empty products array with no product cards', () => {
    const html = generateBarcodesPrintHTML([], mockFormatPrice);
    expect(html).toContain('<!DOCTYPE html>');
    // The CSS class definition exists, but no actual card divs should be rendered
    expect(html).not.toContain('<div class="barcode-card">');
  });
});
