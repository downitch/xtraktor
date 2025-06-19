# xtraktor

## Description

This is a simple tool that scans JS files from web-page and tries to extract additional endpoints from it.

## Dependencies

Currently there are two dependencies:

- puppeteer
- node-fetch

 I've opted using puppeteer since it allows me to also scan SPAs.

## How to install

Make sure you have node.js, npm and git installed in your system, then do this:

```bash
git clone https://github.com/downitch/xtraktor.git
cd xtraktor
npm install
```

Or a one-liner:

```bash
git clone https://github.com/downitch/xtraktor.git && cd xtraktor && npm install
```

## How to use

 ```bash
node index.js -d "domain.name" -c "cookies..."
 ```

 Current version only supports one domain name and one set of cookies that are passed in a following form:

```bash
name=value; name1=value1; ...
```

## TODO

- add support for custom User-Agents
- multithreading
- fail-safe mechanisms
