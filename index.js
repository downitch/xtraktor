import { parseArgs, parsePage, parseContents } from './parsers.js';
import { printBanner, downloadFiles, normalizeTarget, normalizeCookies, normalizeUserAgent, normalizeHeaders } from './middleware.js';

async function init() {
  printBanner();
  const parsedArguments = parseArgs();
  const targetUrl = normalizeTarget(parsedArguments.URL);
  const targetCookies = parsedArguments.cookies ? normalizeCookies(parsedArguments.URL, parsedArguments.cookies) : null;
  const targetUserAgent = parsedArguments.userAgent ? normalizeUserAgent(parsedArguments.userAgent) : null;
  const targetHeaders = parsedArguments.headers ? normalizeHeaders(parsedArguments.headers) : null;
  console.log(`Targeting: ${parsedArguments.URL}\n`);
  const jsFiles = await parsePage({targetUrl, targetCookies, targetUserAgent, targetHeaders});
  console.log(`Found ${jsFiles.length} JS files\n`);
  await downloadFiles(parsedArguments.URL, jsFiles);
  await parseContents(parsedArguments.URL, targetUrl);
};

init();
