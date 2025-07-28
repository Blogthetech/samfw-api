const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

module.exports = async (req, res) => {
  const model = req.query.model?.toUpperCase();
  if (!model) return res.status(400).json({ error: 'Model is required' });

  const url = `https://samfw.com/firmware/${model}`;

  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      defaultViewport: chromium.defaultViewport,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // 🔄 Extra wait to let JS load firmware table
    await page.waitForTimeout(5000);

    // 🧪 Optional: Take screenshot for debugging
    const screenshot = await page.screenshot({ encoding: 'base64' });

    // ✅ Try to extract firmware data
    const data = await page.evaluate(() => {
      const getValue = (label) => {
        const row = [...document.querySelectorAll('tr')]
          .find(tr => tr.innerText.includes(label));
        return row?.querySelectorAll('td')[1]?.innerText.trim() || null;
      };

      return {
        version: getValue('Latest version'),
        size: getValue('Size'),
        date: getValue('Release date'),
      };
    });

    await browser.close();

    if (!data.version) {
      return res.status(500).json({
        error: 'Firmware data not found in HTML',
        debug: { screenshot }
      });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);

  } catch (err) {
    console.error('❌ Scraper crashed:', err.message);
    res.status(500).json({ error: 'Failed to fetch firmware data', message: err.message });
  }
};
