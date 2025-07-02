import path from 'path';
import { readdir, readFile } from 'fs/promises';
import puppeteer from 'puppeteer';

import { DIMENSIONS, UNIVERSAL_REGEX, OUTPUT_DIR, DEFAULT_USER_AGENT, LIVELINESS_HEADERS, FLAGS_WITH_VALUES, BOOLEAN_FLAGS } from './config.js';  

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

export async function parsePage(params = {}) {
  const {
    targetUrl,
    targetFormat,
    targetCookies,
    targetUserAgent,
  } = params;

  if (!targetUrl) {
    console.error('URL not provided.\nUsage: node index.js -l "<URL>"');
    process.exit(1);
  }

  const browser = await puppeteer.launch(
    targetFormat ? { headless: 'new' } : { headless: false, ignoreHTTPSErrors: true, args: [`--window-size=${DIMENSIONS.width},${DIMENSIONS.height}`] }
  );

  if (targetCookies) {
    await browser.setCookie(...targetCookies);
  }

  const page = await browser.newPage();

  await page.setViewport({
    width: DIMENSIONS.width,
    height: DIMENSIONS.height,
    deviceScaleFactor: 1,
  });

  await page.setUserAgent(targetUserAgent || DEFAULT_USER_AGENT);
  await page.setExtraHTTPHeaders(LIVELINESS_HEADERS);

  const jsFiles = new Set();

  page.on('requestfinished', (req) => {
    const url = req.url();
    if (url.endsWith('.js')) {
      jsFiles.add(url);
    }
  });

  try {
    await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });
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
  const foundRaw = new Set();

  for (const file of files) {
    const fullPath = path.resolve(jsDir, file);
    const content = await readFile(fullPath, 'utf8');
    const matches = content.matchAll(UNIVERSAL_REGEX);

    for (const match of matches) {
      if (match[0]) {
        const cleaned = match[0].replace(/['"`]+/g, '');
        foundRaw.add(cleaned);
      }
    }
  }

  const normalizedEndpoints = new Set();

  for (const endpoint of foundRaw) {
    const fullUrl = endpoint.match(/^https?:\/\//) ? endpoint : `${domain.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
    normalizedEndpoints.add(fullUrl);
  }

  console.log(`\nFound ${normalizedEndpoints.size} unique endpoints:\n`);
  for (const ep of normalizedEndpoints) {
    console.log(ep);
  }
};
