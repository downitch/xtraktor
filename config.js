export const DIMENSIONS = {width:1600, height:900};

export const OUTPUT_DIR = './output';

export const UNIVERSAL_REGEX = new RegExp(
  [
    /\b(?:https?|wss?):\/\/[^\s"'`\\<>{}]+/,
    /(?<![a-zA-Z0-9])\/[a-zA-Z0-9/_\-?=&#.%]+/,
    /\b(?:fetch|axios\.\w+)\(['"]([^'"${}]+)['"]\)/,
    /this\.fetch\(this\.url\("([^"]+)"\)/, // thank you @SirBugs
    /"\?(.*?)"/, // thank you @SirBugs
    /"\/(.*?)"/, // thank you @SirBugs
    /'\/(.*?)'/, // thank you @SirBugs
    /`\/(.*?)`/, // thank you @SirBugs
  ]
    .map(r => r.source)
    .join('|'),
  'g'
);

export const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export const LIVELINESS_HEADERS = {
  'accept-language': 'en-US,en;q=0.9',
  'connection': 'keep-alive'
};

export const FLAGS_WITH_VALUES = {
  '-l': 'URL',
  '-c': 'cookies',
  '-u': 'userAgent'
};

export const BOOLEAN_FLAGS = {
  '-r': 'recursive',
  '-d': 'dummy'
};