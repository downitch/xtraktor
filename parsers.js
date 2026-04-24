import os from 'os';
import path from 'path';
import { readdir, readFile } from 'fs/promises';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import { DIMENSIONS, UNIVERSAL_REGEX, OUTPUT_DIR, DEFAULT_USER_AGENT, LIVELINESS_HEADERS, FLAGS_WITH_VALUES, BOOLEAN_FLAGS } from './config.js';

export function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') {
      console.log('\nUsage: node index.js -l "<URL>" [-u "<User-Agent>" -c "<Cookies>" -H "<Headers>" -e "<Extension>" -x "<Regex>" -r <Recursive?>]\n');
      process.exit(0);
    }
    if (FLAGS_WITH_VALUES[arg]) {
      const value = args[i + 1];
      if (!value || value.startsWith('-')) {
        console.error(`\nMissing value for ${arg}`);
        process.exit(1);
      }
      if (arg === '-H') {
        options[FLAGS_WITH_VALUES[arg]] = [...Array.from(options[FLAGS_WITH_VALUES[arg]] ? options[FLAGS_WITH_VALUES[arg]] : []), value];
      } else options[FLAGS_WITH_VALUES[arg]] = value;
      i++;
    } else if (BOOLEAN_FLAGS[arg]) {
      options[BOOLEAN_FLAGS[arg]] = true;
    }
  }
  if (!options.URL) {
    console.error('\nUsage: node index.js -l "<URL>" [-u "<User-Agent>" -c "<Cookies>" -H "<Headers>" -e "<Extension>" -x "<Regex>" -r <Recursive?>]\nManual: node index.js --help\n');
    process.exit(1);
  }
  return options;
};

export async function parsePage(params = {}) {
  let totalClicks = 0;
  const MAX_CLICKS = 50;
  const isMac = os.platform() === 'darwin';
  const modifierKey = isMac ? 'Meta' : 'Control';
  const {
    targetUrl,
    targetFormat,
    targetCookies,
    targetUserAgent,
    targetHeaders,
    targetExtension
  } = params;

  if (!targetUrl) {
    console.error('URL not provided.\nUsage: node index.js -l "<URL>"');
    process.exit(1);
  }

  puppeteer.use(StealthPlugin());

  const browser = await puppeteer.launch(
    targetFormat ? { headless: 'new' } : {
      headless: false, ignoreHTTPSErrors: true, args: [
        `--window-size=${DIMENSIONS.width},${DIMENSIONS.height}`
      ] 
    }
  );

  const context = browser.defaultBrowserContext();

  const page = await context.newPage();

  if (targetCookies) {
    await context.setCookie(...targetCookies);
  }

  await page.setViewport({
    width: DIMENSIONS.width,
    height: DIMENSIONS.height,
    deviceScaleFactor: 1,
  });

  await page.setUserAgent(targetUserAgent || DEFAULT_USER_AGENT);

  if (targetHeaders) {
    page.setExtraHTTPHeaders({...LIVELINESS_HEADERS, ...targetHeaders});
  } else await page.setExtraHTTPHeaders(LIVELINESS_HEADERS);

  const attachedFiles = new Set();

  page.on('requestfinished', (req) => {
    const url = req.url();
    if (targetExtension && url.includes(targetExtension)) {
      attachedFiles.add(url);
    } else {
      console.log('Normal execution...');
      if (url.includes('.js') || url.includes('.map') || url.includes('source') || url.includes('src')) {
        attachedFiles.add(url);
        if (url.includes('.js') && !url.includes('.json')) attachedFiles.add(url.replace('.js', '.js.map'));
        const reg = /\.([a-zA-Z0-9]{16})(\.js)(\?|$)/i;
        if (reg.test(url)) {
          const cleanedUrl = url.replace(reg, '$2$3');
          attachedFiles.add(cleanedUrl);
          attachedFiles.add(cleanedUrl.replace('.js', '.js.map'));
        }
      }
    }
  });

  try {
    await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });
    const clicked = new Set();
    async function explorePage(maxDepth = 5, depth = 0) {
      if (depth >= maxDepth || totalClicks >= MAX_CLICKS) return;
      const elements = await page.$$eval(
        'a, button, [role="button"]',
        els => els.map((el, i) => ({
          index: i,
          text: el.innerText,
          href: el.href || null
        }))
      );
      for (let i = 0; i < elements.length; i++) {
        const elData = elements[i];
        const identifier = elData.text || elData.href || `index-${i}`;
        if (clicked.has(identifier)) continue;
        if (totalClicks >= MAX_CLICKS) break;
        clicked.add(identifier);
        console.log("Clicking:", identifier);
        const beforePages = await browser.pages();
        const beforeUrl = page.url();
        try {
          // Re-select fresh element by index each time
          const handles = await page.$$('a, button, [role="button"]');
          const handle = handles[i];
          if (!handle) continue;
          await handle.evaluate(e => e.scrollIntoView());
          await page.keyboard.down(modifierKey);
          await handle.click();
          totalClicks += 1;
          await page.keyboard.up(modifierKey);
          // Wait for either new tab OR SPA update
          await page.waitForTimeout(1500);
          const afterPages = await browser.pages();
          if (afterPages.length > beforePages.length) {
            const newTab = afterPages.find(p => !beforePages.includes(p));
            await newTab.waitForNetworkIdle({ idleTime: 1000 }).catch(() => {});
            console.log("New tab opened:", newTab.url());
            await newTab.close();
            await page.bringToFront();
          }
          else if (page.url() !== beforeUrl) {
            console.log("SPA route change:", page.url());
            await page.waitForNetworkIdle({ idleTime: 1000 }).catch(() => {});
            await explorePage(maxDepth, depth + 1);
            await page.goBack().catch(() => {});
            await page.waitForTimeout(1000);
          }
        } catch (err) {
          console.log("Click failed:", err.message);
        }
      }
    }
    await explorePage(2);
  } catch (err) {
    console.error(`Failed to load page: ${err.message}`);
  } finally {
    await browser.close();
  }

  return [...attachedFiles];
};

export async function parseContents(target, domain, regex) {
  const jsDir = path.join(OUTPUT_DIR, target, 'temp');
  const files = await readdir(jsDir);
  const foundRaw = new Set();
  console.log('\n');
  for (const file of files) {
    const fullPath = path.resolve(jsDir, file);
    const content = await readFile(fullPath, 'utf8');
    const reg = /sourcemap/ig;
    if(content.match(reg)) console.log(`[IMPORTANT] THIS FILE CONTAINS INLINE SOURCEMAP: ${fullPath}`);
    const matches = content.matchAll(regex || UNIVERSAL_REGEX);
    if(!regex) {
      for (const match of matches) {
        if (match[0]) {
          const cleaned = match[0].replace(/['"`]+/g, '');
          foundRaw.add(cleaned);
        }
      }
    } else {
      for (const match of matches) {
        if (match[0]) {
          console.log(`Found ${match[0]} in ${file}`);
        }
      }
    }
  }
  if(!regex) {
    const normalizedEndpoints = new Set();
    for (const endpoint of foundRaw) {
      const fullUrl = endpoint.match(/^https?:\/\//) ? endpoint : `${domain.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
      normalizedEndpoints.add(fullUrl);
    }
    console.log(`Found ${normalizedEndpoints.size} unique endpoints:\n`);
    for (const ep of normalizedEndpoints) {
      console.log(ep);
    }
  }
};
