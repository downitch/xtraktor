import path from 'path';
import { readdir, readFile } from 'fs/promises';
import puppeteer from 'puppeteer';

import { DIMENSIONS, UNIVERSAL_REGEX, OUTPUT_DIR, 
         DEFAULT_USER_AGENT, LIVELINESS_HEADERS,
         FLAGS_WITH_VALUES, BOOLEAN_FLAGS } from './config.js';

export function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') {
      console.log('\nUsage: node index.js -l "<URL>" [-u "<User-Agent>" -c "<Cookies>" -r <Recursive?>]\n');
      process.exit(0);
    }
    if (FLAGS_WITH_VALUES[arg]) {
      const value = args[i + 1];
      if (!value || value.startsWith('-')) {
        console.error(`\nMissing value for ${arg}`);
        process.exit(1);
      }
      options[FLAGS_WITH_VALUES[arg]] = value;
      i++;
    } else if (BOOLEAN_FLAGS[arg]) {
      options[BOOLEAN_FLAGS[arg]] = true;
    }
  }
  if (!options.URL) {
    console.error('\nUsage: node index.js -l "<URL>" [-u "<User-Agent>" -c "<Cookies>" -r <Recursive?>]\nManual: node index.js --help\n');
    process.exit(1);
  }
  return options;
};

export async function parsePage(params) {
  const { targetUrl, targetFormat, targetCookies, targetUserAgent } = {
    targetUrl: null,
    targetFormat: null,
    targetCookies: null,
    targetUserAgent: null,
    ...params
  };
  if(targetUrl === null) {
    console.error('URL is not provided properly...\nUsage: node index.js -l "<URL>"');
    process.exit(1);
  }
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
    const customUA = targetUserAgent ? targetUserAgent : DEFAULT_USER_AGENT;
    await page.setUserAgent(customUA);
    // additional headers to make it less obvious
    await page.setExtraHTTPHeaders(LIVELINESS_HEADERS);
    // now let's visit the page
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
