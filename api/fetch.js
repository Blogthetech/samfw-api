const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

module.exports = async (req, res) => {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto('https://samfw.com/firmware/SM-S911U');

    const content = await page.content();

    await browser.close();

    res.status(200).json({ content });
  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ error: 'Failed to fetch firmware data', message: error.message });
  }
};
