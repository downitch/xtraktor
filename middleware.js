import fs from 'fs';
import path from 'path';
import { mkdir } from 'fs/promises';
import { finished } from 'stream/promises';
import fetch from 'node-fetch';

import { OUTPUT_DIR } from './config.js'; 

export function printBanner() {
  console.log(`

▒██   ██▒▄▄▄█████▓ ██▀███   ▄▄▄       ██ ▄█▀▄▄▄█████▓ ▒█████   ██▀███  
▒▒ █ █ ▒░▓  ██▒ ▓▒▓██ ▒ ██▒▒████▄     ██▄█▒ ▓  ██▒ ▓▒▒██▒  ██▒▓██ ▒ ██▒
░░  █   ░▒ ▓██░ ▒░▓██ ░▄█ ▒▒██  ▀█▄  ▓███▄░ ▒ ▓██░ ▒░▒██░  ██▒▓██ ░▄█ ▒
 ░ █ █ ▒ ░ ▓██▓ ░ ▒██▀▀█▄  ░██▄▄▄▄██ ▓██ █▄ ░ ▓██▓ ░ ▒██   ██░▒██▀▀█▄  
▒██▒ ▒██▒  ▒██▒ ░ ░██▓ ▒██▒ ▓█   ▓██▒▒██▒ █▄  ▒██▒ ░ ░ ████▓▒░░██▓ ▒██▒
▒▒ ░ ░▓ ░  ▒ ░░   ░ ▒▓ ░▒▓░ ▒▒   ▓▒█░▒ ▒▒ ▓▒  ▒ ░░   ░ ▒░▒░▒░ ░ ▒▓ ░▒▓░
░░   ░▒ ░    ░      ░▒ ░ ▒░  ▒   ▒▒ ░░ ░▒ ▒░    ░      ░ ▒ ▒░   ░▒ ░ ▒░
 ░    ░    ░        ░░   ░   ░   ▒   ░ ░░ ░   ░      ░ ░ ░ ▒    ░░   ░ 
 ░    ░              ░           ░  ░░  ░                ░ ░     ░
  xtraktor - puppeteer based tool to extract endpoints from JS files.
                          author: @downitch
     support and contribute: https://github.com/downitch/xtraktor
`);
};

export async function downloadFiles(target, files) {
  const baseDir = path.join(OUTPUT_DIR, target);
  const tempDir = path.join(baseDir, 'temp');
  await mkdir(tempDir, { recursive: true });
  const tasks = files.map(async (url) => {
    try {
      const { pathname } = new URL(url);
      const baseName = path.basename(pathname).split('?')[0] || 'file';
      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const fileName = `${baseName}_${randomSuffix}.js`;
      const filePath = path.resolve(tempDir, fileName);

      const response = await fetch(url);
      if (!response.ok || !response.body) {
        throw new Error(`Bad response: ${response.status}`);
      }
      const nodeReadable = typeof response.body.pipe === 'function' ? response.body : Readable.fromWeb(response.body);
      await finished(nodeReadable.pipe(fs.createWriteStream(filePath, { flags: 'wx' })));
      console.log(`Downloaded: ${url}`);
    } catch (err) {
      console.warn(`Skipped ${url}: ${err.message}`);
    }
  });
  await Promise.allSettled(tasks);
};

export function normalizeTarget(targetRaw) {
  try {
    return new URL(targetRaw.startsWith('http') ? targetRaw : `https://${targetRaw}`).toString();
  } catch (err) {
    console.error(`Invalid target URL: ${targetRaw}`);
    process.exit(1);
  }
};

export function normalizeUserAgent(targetUserAgent) {
  try {
    const rawUserAgent = targetUserAgent.indexOf('User-Agent:') !== -1 ? targetUserAgent : `User-Agent: ${targetUserAgent}`;
    return rawUserAgent;
  } catch(err) {
    console.error(`Invalid User-Agent: ${targetUserAgent}`);
    process.exit(1);
  }
};

export function normalizeCookies(domain, targetCookies) {
  try {
    const normalizedCookies = [];
    const rawCookies = targetCookies.indexOf('Cookies:') !== -1 ? targetCookies.substring(7, targetCookies.length - 1) : targetCookies;
    const cookies = rawCookies.split(';');
    for(const cookie of cookies) {
      normalizedCookies.push({
        domain: domain.match(/\/?\/?(.*)\/?/)[1],
        name: cookie.split('=')[0].trim(),
        value: cookie.split('=')[1].trim()
      });
    }
    return normalizedCookies;
  } catch(err) {
    console.error(`Invalid custom cookies: ${targetCookies}`);
    process.exit(1);
  }
};