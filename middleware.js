import fs from 'fs';
import path from 'path';
import { mkdir } from 'fs/promises';
import { finished } from 'stream/promises';
import fetch from 'node-fetch';

import { OUTPUT_DIR } from './config.js'; 

export async function downloadFiles(target, files) {
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
};

export function normalizeTarget(targetRaw) {
  try {
    return new URL(targetRaw.startsWith('http') ? targetRaw : `https://${targetRaw}`).toString();
  } catch (err) {
    console.error(`Invalid target URL: ${targetRaw}`);
    process.exit(1);
  }
};

export function normalizeCookies(domain, targetCookies) {
  try {
    const normalizedCookies = [];
    const rawCookies = targetCookies.indexOf('Cookies:') != -1 ? targetCookies.substring(7, targetCookies.length - 1) : targetCookies;
    const cookies = rawCookies.split(';');
    for(const cookie of cookies) {
      normalizedCookies.push({
        domain: domain.match(/\/\/(.*)\//)[1],
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

export function printBanner() {
  const version = '0.0.1';
  const updateDate = '05.14.2025';
  const author = 'downitch';
  console.log(`xtraktor - a tool to extract possible URLs from JS files.\nversion: ${version}\nlast update: ${updateDate}\nauthor: ${author}\n`);
};