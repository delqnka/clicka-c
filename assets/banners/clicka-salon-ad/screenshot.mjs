import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });
await page.goto('file://' + __dirname + '/banner.html', { waitUntil: 'networkidle0' });
await page.waitForTimeout(1500);
await page.screenshot({ path: __dirname + '/banner-1080x1080.png', fullPage: false });
await browser.close();
console.log('Done!');
