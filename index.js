import { isOllamaUp, ollamaRequest } from './ai.js';
import { katanaGrab, gauGrab, waybackGrab } from './alternatives.js';
import { printBanner, downloadFiles, normalizeTarget, normalizeCookies, normalizeUserAgent } from './middleware.js';
import { parseArgs, parsePage, parseContents } from './parsers.js';

async function init() {
  printBanner();
  const parsedArguments = parseArgs();
  // error out if AI flag is set but Ollama isn't running
  if(parsedArguments.ai && !isOllamaUp()) return 1;
  const targetUrl = normalizeTarget(parsedArguments.URL);
  const targetCookies = parsedArguments.cookies ? normalizeCookies(parsedArguments.URL, parsedArguments.cookies) : null;
  const targetUserAgent = parsedArguments.userAgent ? normalizeUserAgent(parsedArguments.userAgent) : null;
  console.log(`Targeting: ${parsedArguments.URL}\n`);
  // 3rd party tools use
  const katanaOutput = parsedArguments.katana ? await katanaGrab(targetUrl) : null;
  const gauOutput = parsedArguments.gau ? await gauGrab(targetUrl) : null;
  const waybackOutput = parsedArguments.wayback ? await waybackGrab(targetUrl) : null;
  // xtraktor magic
  const jsFiles = await parsePage({targetUrl, targetCookies, targetUserAgent});
  console.log(`Found ${jsFiles.length} JS files\n`);
  await downloadFiles(parsedArguments.URL, jsFiles);
  const endpoints = Array.from(await parseContents(parsedArguments.URL, targetUrl));
  console.log(`\nFound ${endpoints.length} unique endpoints\n`);
  // output sequence
  if(!parsedArguments.ai) {
    for(const ep of endpoints) console.log(ep);
    if(parsedArguments.katana && katanaOutput !== null) console.log(`\nOutput from katana command:\n${katanaOutput}`);
    if(parsedArguments.gau && gauOutput !== null) console.log(`\nOutput from gau command:\n${gauOutput}`);
    if(parsedArguments.wayback && waybackOutput !== null) console.log(`\nOutput from waybackurls command:\n${waybackOutput}`);
  } else {
    console.log('\n\nData collected, now it is passed to AI for analysis...');
    const slop = `${endpoints.join('\n')}\n${katanaOutput !== null ? '' + katanaOutput + '\n\n' : ''}${gauOutput !== null ? '' + gauOutput + '\n\n' : ''}${waybackOutput !== null ? '' + waybackOutput + '\n\n' : ''}`;
    const prompt = `You are tasked with a penetration test of ${targetUrl}. You are given output of recon activity. Analyze received data. Act as a red-team member preparing for an web-exploitation phase. Data: `;
    const aiResponse = await ollamaRequest(prompt, slop);
    console.log(`AI (gpt-oss agent) response:\n\n${aiResponse}`);
  }
};

init();
