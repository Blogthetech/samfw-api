const puppeteer = require('puppeteer');

module.exports = async (req, res) => {
  const { model } = req.query;

  if (!model) {
    return res.status(400).json({ error: 'Missing model parameter' });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });

    const page = await browser.newPage();
    const url = `https://samfw.com/firmware/${model}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const data = await page.evaluate(() => {
      const version = document.querySelector('.table td a')?.textContent?.trim() || 'Unknown';
      const size = document.querySelector('.table td:nth-child(4)')?.textContent?.trim() || 'Unknown';
      const date = document.querySelector('.table td:nth-child(3)')?.textContent?.trim() || 'Unknown';

      return { version, size, date };
    });

    if (!data.version || data.version === 'Unknown') {
      throw new Error('Could not extract firmware details');
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json(data);

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'Failed to fetch firmware data',
      message: err.message,
    });
  } finally {
    if (browser) await browser.close();
  }
};
