import path from 'path';
import { readdir, readFile } from 'fs/promises';
import puppeteer from 'puppeteer';

import { UNIVERSAL_REGEX, OUTPUT_DIR } from './config.js';

export function parseArgs() {
  const domainFlagIndex = process.argv.indexOf('-d');
  const cookiesFlagIndex = process.argv.indexOf('-c');
  if (domainFlagIndex === -1 || !process.argv[domainFlagIndex + 1]) {
    console.error('Usage: node index.js -d "example.com"');
    process.exit(1);
  }
  let customArgs = [process.argv[domainFlagIndex + 1]];
  if(cookiesFlagIndex != -1) customArgs = [...customArgs, process.argv[cookiesFlagIndex + 1]];
  return customArgs;
};

export async function parsePage(targetUrl, targetCookies = null) {
  const browser = await puppeteer.launch({ headless: 'new' });

  if(targetCookies != null) browser.setCookie(...targetCookies);

  const page = await browser.newPage();
  const jsFiles = new Set();

  page.on('requestfinished', (req) => {
    const url = req.url();
    if (url.endsWith('.js')) jsFiles.add(url);
  });

  try {
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
    // Clean up trailing quotes or parens
    endpoint = endpoint.replace(/['")]+$/, '');
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