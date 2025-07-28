const puppeteer = require('puppeteer');

module.exports = async (req, res) => {
  const model = req.query.model?.toUpperCase();
  if (!model) {
    return res.status(400).json({ error: 'Model required' });
  }

  const url = `https://samfw.com/firmware/${model}`;

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const data = await page.evaluate(() => {
      const getValue = (label) => {
        const row = [...document.querySelectorAll('tr')]
          .find(tr => tr.innerText.includes(label));
        return row?.querySelectorAll('td')[1]?.innerText.trim() || null;
      };

      return {
        version: getValue('Latest version'),
        size: getValue('Size'),
        date: getValue('Release date')
      };
    });

    await browser.close();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching firmware:', err.message);
    res.status(500).json({ error: 'Failed to fetch firmware data' });
  }
};
