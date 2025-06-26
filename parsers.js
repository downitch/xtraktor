import path from 'path';
import { readdir, readFile } from 'fs/promises';
import puppeteer from 'puppeteer';

import { DIMENSIONS, UNIVERSAL_REGEX, OUTPUT_DIR } from './config.js';

export function parseArgs() {
  const helpFlagIndex = process.argv.indexOf('--help');
  const domainFlagIndex = process.argv.indexOf('-d');
  const cookiesFlagIndex = process.argv.indexOf('-c');
  const useragentFlagIndex = process.argv.indexOf('-u');
  if (helpFlagIndex !== -1) {
    console.log('\nUsage: node index.js -d "example.com" [-u "<User-Agent>" -c "<Cookies>"]\n');
    process.exit(0);
  }
  if (domainFlagIndex === -1 || !process.argv[domainFlagIndex + 1]) {
    console.error('\nUsage: node index.js -d "example.com" [-u "<User-Agent>" -c "<Cookies>"]\nManual: node index.js --help\n');
    process.exit(1);
  }
  let customArgs = [process.argv[domainFlagIndex + 1]];
  if(cookiesFlagIndex !== -1) customArgs = [...customArgs, process.argv[cookiesFlagIndex + 1]];
  if(useragentFlagIndex !== -1) customArgs = [...customArgs, process.argv[useragentFlagIndex + 1]];
  return [...customArgs];
};

export async function parsePage(params) {
  const { targetUrl, targetFormat, targetCookies, targetUserAgent } = params;
  const browserSettings = !targetFormat ? {
    headless: false,
    ignoreHTTPSErrors: true,
    args: [`--window-size=${DIMENSIONS.width},${DIMENSIONS.height}`]
  } : { headless: 'new' };

  const browser = await puppeteer.launch(browserSettings);

  if(targetCookies != null) browser.setCookie(...targetCookies);

  const jsFiles = new Set();
  const page = await browser.newPage();

  page.setViewport({
    width: DIMENSIONS.width,
    height: DIMENSIONS.height,
    deviceScaleFactor: 1,
  });

  page.on('requestfinished', (req) => {
    const url = req.url();
    if (url.endsWith('.js')) jsFiles.add(url);
  });

  try {
    const customUA = targetUserAgent ? targetUserAgent : 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.11; rv:138.0) Gecko/20100101 Firefox/138.1';
    await page.setUserAgent(customUA);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  } catch (err) {
    console.error(`Failed to load page: ${err.message}`);
  } finally {
    await browser.close();
  }

  return [...jsFiles];
};

export async function parseContents(target, domain) {
  const jsDir = path.join(OUTPUT_DIR, target, 'temp');
  const files = await readdir(jsDir);
  const foundEndpoints = new Set();
  const found = new Set();

  for (const file of files) {
    const fullPath = path.resolve(jsDir, file);
    const contents = await readFile(fullPath, 'utf8');
    const matches = [...contents.matchAll(UNIVERSAL_REGEX)];

    for (const match of matches) {
      const endpoint = match[0];
      if (endpoint) foundEndpoints.add(endpoint);
    }
  }

  for (let endpoint of foundEndpoints) {
    // Clean up quotes
    endpoint = endpoint.replace(/['"`]*/g, '');
    // If not a full URL, prepend domain
    if (!/^https?:\/\//.test(endpoint)) {
      const normalized = domain.replace(/\/+$/, '') + endpoint;
      found.add(normalized);
    } else {
      found.add(endpoint);
    }
  }

  console.log(`\nFound ${foundEndpoints.size} unique endpoints:\n`);
  [...found].forEach(ep => console.log(ep));
};
