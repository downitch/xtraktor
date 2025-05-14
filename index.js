import fs from 'fs';
import path from 'path';
import { mkdir, readdir, readFile } from 'fs/promises';
import puppeteer from 'puppeteer';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import fetch from 'node-fetch';

const OUTPUT_DIR = './output';

const universalRegex = new RegExp(
  [
    // Full URLs
    /\b(?:https?|wss?):\/\/[^\s"'`\\<>{}]+/,
    // Relative paths: /anything/... (exclude ${}, quotes, etc.)
    /(?<![a-zA-Z0-9])\/[a-zA-Z0-9/_\-?=&#.%]+/,
    // fetch("...") or axios.get("...")
    /\b(?:fetch|axios\.\w+)\(['"]([^'"${}]+)['"]\)/,
  ]
    .map(r => r.source)
    .join('|'),
  'g'
);

async function parseContents(target, domain) {
  const jsDir = path.join(OUTPUT_DIR, target, 'temp');
  const files = await readdir(jsDir);
  const foundEndpoints = new Set();
  const found = new Set();

  for (const file of files) {
    const fullPath = path.resolve(jsDir, file);
    const contents = await readFile(fullPath, 'utf8');
    const matches = [...contents.matchAll(universalRegex)];

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
}

async function downloadFiles(target, files) {
  const baseDir = path.join(OUTPUT_DIR, target);
  const tempDir = path.join(baseDir, 'temp');
  await mkdir(tempDir, { recursive: true });

  const tasks = files.map(async (url) => {
    try {
      const urlObj = new URL(url);
      const baseName = path.basename(urlObj.pathname);
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileName = `${baseName}_${randomSuffix}.js`;
      const filePath = path.resolve(tempDir, fileName);

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);

      const fileStream = fs.createWriteStream(filePath, { flags: 'wx' });
      await finished(response.body.pipe(fileStream));
      console.log(`Downloaded: ${url}`);
    } catch (err) {
      console.warn(`Skipped ${url}: ${err.message}`);
    }
  });

  await Promise.allSettled(tasks);
}

async function parsePage(targetUrl) {
  const browser = await puppeteer.launch({ headless: 'new' });
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
}

function normalizeTarget(targetRaw) {
  try {
    return new URL(targetRaw.startsWith('http') ? targetRaw : `https://${targetRaw}`).toString();
  } catch (err) {
    console.error(`Invalid target URL: ${targetRaw}`);
    process.exit(1);
  }
}

function parseArgs() {
  const domainFlagIndex = process.argv.indexOf('-d');
  if (domainFlagIndex === -1 || !process.argv[domainFlagIndex + 1]) {
    console.error('Usage: node index.js -d "example.com"');
    process.exit(1);
  }
  return process.argv[domainFlagIndex + 1];
}

function printBanner() {
  const version = '0.0.1';
  const updateDate = '05.14.2025';
  const author = 'downitch';
  console.log(`xtraktor - a tool to extract possible URLs from JS files.\nversion: ${version}\nlast update: ${updateDate}\nauthor: ${author}\n`);
}

async function init() {
  printBanner();
  const targetRaw = parseArgs();
  const targetUrl = normalizeTarget(targetRaw);
  console.log(`Targeting: ${targetUrl}\n`);

  const jsFiles = await parsePage(targetUrl);
  console.log(`Found ${jsFiles.length} JS files\n`);

  await downloadFiles(targetRaw, jsFiles);
  await parseContents(targetRaw, targetUrl);
}

init();
