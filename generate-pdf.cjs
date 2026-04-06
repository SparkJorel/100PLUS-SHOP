const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const md = fs.readFileSync(path.join(__dirname, '..', 'MANUEL_UTILISATEUR.md'), 'utf-8');

  // Convert markdown to HTML
  let html = md
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/---/g, '<hr>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$1. $2</li>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');

  const logoPath = path.resolve(__dirname, '..', 'logo_100plus.jpg').replace(/\\/g, '/');

  const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8">
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11.5px; line-height: 1.65; color: #333; padding: 0 10px; }
  h1 { color: #FF0066; font-size: 22px; border-bottom: 3px solid #FF0066; padding-bottom: 8px; margin-top: 35px; }
  h2 { color: #FF0066; font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 28px; }
  h3 { color: #444; font-size: 13px; margin-top: 18px; }
  h4 { color: #666; font-size: 12px; margin-top: 12px; }
  li { margin: 3px 0; margin-left: 15px; }
  strong { color: #d6005c; }
  p { margin: 6px 0; }
  hr { border: none; border-top: 2px solid #FF0066; margin: 25px 0; }
</style>
</head>
<body>
<div style="text-align:center;margin:30px 0 40px;">
  <img src="file:///${logoPath}" height="70" style="margin-bottom:15px;"><br>
  <span style="font-size:28px;font-weight:bold;color:#FF0066;">Manuel d'utilisation</span><br>
  <span style="color:#888;font-size:13px;">Guide complet pour l'équipe 100PLUS SHOP</span>
</div>
${html}
<div style="text-align:center;margin-top:40px;color:#999;font-size:10px;">
  <hr>100PLUS SHOP — Manuel d'utilisation — 2026
</div>
</body></html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'load' });

  const outputPath = path.join(__dirname, '..', 'MANUEL_UTILISATEUR_100PLUS_SHOP.pdf');
  await page.pdf({
    path: outputPath,
    format: 'A4',
    margin: { top: '18mm', bottom: '22mm', left: '14mm', right: '14mm' },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;text-align:center;font-size:9px;color:#999;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });

  await browser.close();

  const stats = fs.statSync(outputPath);
  console.log('PDF genere: MANUEL_UTILISATEUR_100PLUS_SHOP.pdf');
  console.log('Taille:', Math.round(stats.size / 1024), 'Ko');
})();
