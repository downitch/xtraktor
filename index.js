import { parseArgs, parsePage, parseContents } from './parsers.js';
import { downloadFiles, normalizeTarget, normalizeCookies, printBanner } from './middleware.js';

async function init() {
  printBanner();
  const [targetRaw, customCookies] = parseArgs();
  const targetUrl = normalizeTarget(targetRaw);
  const targetCookies = customCookies ? normalizeCookies(targetUrl, customCookies) : null;
  console.log(`Targeting: ${targetUrl}\n`);
  const jsFiles = await parsePage(targetUrl, targetCookies);
  console.log(`Found ${jsFiles.length} JS files\n`);
  await downloadFiles(targetRaw, jsFiles);
  await parseContents(targetRaw, targetUrl);
};

init();
