import { parseArgs, parsePage, parseContents } from './parsers.js';
import { printBanner, downloadFiles, normalizeTarget, normalizeCookies, normalizeUserAgent, normalizeHeaders, normalizeExtension, normalizeRegexp } from './middleware.js';

async function init() {
  printBanner();
  const parsedArguments = parseArgs();
  const targetUrl = normalizeTarget(parsedArguments.URL);
  const targetCookies = parsedArguments.cookies ? normalizeCookies(parsedArguments.URL, parsedArguments.cookies) : null;
  const targetUserAgent = parsedArguments.userAgent ? normalizeUserAgent(parsedArguments.userAgent) : null;
  const targetHeaders = parsedArguments.headers ? normalizeHeaders(parsedArguments.headers) : null;
  const targetExtension = parsedArguments.extension ? normalizeExtension(parsedArguments.extension) : null;
  const targetRegexp = parsedArguments.regexp ? normalizeRegexp(parsedArguments.regexp) : null;
  console.log(`Targeting: ${parsedArguments.URL}\n`);
  const jsFiles = await parsePage({targetUrl, targetCookies, targetUserAgent, targetHeaders, targetExtension});
  console.log(`Found ${jsFiles.length} JS files\n`);
  await downloadFiles({
    target: parsedArguments.URL,
    cookies: targetCookies,
    headers: targetHeaders,
    userAgent: targetUserAgent,
    files: jsFiles
  });
  await parseContents(parsedArguments.URL, targetUrl, targetRegexp);
};

init();
