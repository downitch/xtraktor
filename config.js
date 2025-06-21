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