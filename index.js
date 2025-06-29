import { parseArgs, parsePage, parseContents } from './parsers.js';
import { downloadFiles, normalizeTarget, normalizeCookies, normalizeUserAgent } from './middleware.js';

async function init() {
  const parsedArguments = parseArgs();
  const targetUrl = normalizeTarget(parsedArguments.URL);
  const targetCookies = parsedArguments.cookies ? normalizeCookies(parsedArguments.URL, parsedArguments.cookies) : null;
  const targetUserAgent = parsedArguments.userAgent ? normalizeUserAgent(parsedArguments.userAgent) : null;
  console.log(`Targeting: ${parsedArguments.URL}\n`);
  const jsFiles = await parsePage({targetUrl, targetCookies, targetUserAgent});
  console.log(`Found ${jsFiles.length} JS files\n`);
  await downloadFiles(parsedArguments.URL, jsFiles);
  await parseContents(parsedArguments.URL, targetUrl);
};

init();
