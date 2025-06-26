import { parseArgs, parsePage, parseContents } from './parsers.js';
import { downloadFiles, normalizeTarget, normalizeCookies, normalizeUserAgent } from './middleware.js';

async function init() {
  const [targetRaw, customCookies, customUserAgent] = parseArgs();
  const targetUrl = normalizeTarget(targetRaw);
  const targetCookies = customCookies ? normalizeCookies(targetUrl, customCookies) : null;
  const targetUserAgent = customUserAgent ? normalizeUserAgent(customUserAgent) : null;
  console.log(`Targeting: ${targetUrl}\n`);
  const jsFiles = await parsePage({targetUrl, targetCookies, targetUserAgent});
  console.log(`Found ${jsFiles.length} JS files\n`);
  await downloadFiles(targetRaw, jsFiles);
  await parseContents(targetRaw, targetUrl);
};

init();
