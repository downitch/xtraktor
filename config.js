export const OUTPUT_DIR = './output';

export const UNIVERSAL_REGEX = new RegExp(
  [
    // Full URLs
    /\b(?:https?|wss?):\/\/[^\s"'`\\<>{}]+/,
    // Relative paths: /anything/... (exclude ${}, quotes, etc.)
    /(?<![a-zA-Z0-9])\/[a-zA-Z0-9/_\-?=&#.%]+/,
    // fetch("...") or axios.get("...")
    /\b(?:fetch|axios\.\w+)\(['"]([^'"${}]+)['"]\)/,
    // ("/...") relative paths in parenthesis
    // /(^.*?("|')(\/[\w\d\W\?\/&=\#\.\!:_-]*?)(\2).*$)/,
  ]
    .map(r => r.source)
    .join('|'),
  'g'
);