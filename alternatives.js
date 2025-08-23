import { execSync, spawn } from 'child_process';

export function katanaGrab(domain) {
  console.log('Trying katana to collect URLs');
  try {
    execSync('which katana');
  } catch(error) {
    console.error('katana is not installed on this system, skipping...');
    return null;
  }
  const output = spawn('katana', ['-u', domain, '-silent', '-o', '-', '-jc', '-jsl'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return new Promise(r => {
    let out = '';
    output.stdout.on('data', data => out += data.toString());
    output.on('close', () => r(out));
  });
};

export function gauGrab(domain) {
  console.log('Trying GAU to collect more URLs');
  try {
    execSync('which gau');
  } catch(error) {
    console.error('gau is not installed on this system, skipping...');
    return null;
  }
  const output = spawn('gau', [domain], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return new Promise(r => {
    let out = '';
    output.stdout.on('data', data => out += data.toString());
    output.on('close', () => r(out));
  });
};

export function waybackGrab(domain) {
  console.log('Trying waybackurls to collect additional URLs');
  try {
    execSync('which waybackurls');
  } catch(error) {
    console.error('waybackurls is not installed on this system, skipping...');
    return null;
  }
  const output = spawn('waybackurls', [domain], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  return new Promise(r => {
    let out = '';
    output.stdout.on('data', data => out += data.toString());
    output.on('close', () => r(out));
  });
};

// execSync is probably not the best approach since it dies on big outputs
// export function katanaGrabSync(domain) {
//   const isInstalled = execSync('which katana');
//   if(isInstalled.indexOf('not found') !== -1) {
//     console.error('katana is not installed on this system, skipping...');
//     return null;
//   }
//   const output = execSync(`katana -jc -jsl -u ${domain}`).toString();
//   return output;
// };

// export function gauGrabSync(domain) {
//   const isInstalled = execSync('which gau');
//   if(isInstalled.indexOf('not found') !== -1) {
//     console.error('GAU is not installed on this system, skipping...').toString();
//     return null;
//   }
//   const output = execSync(`gau ${domain}`);
//   return output;
// };

// export function waybackGrabSync(domain) {
//   const isInstalled = execSync('which waybackurls');
//   if(isInstalled.indexOf('not found') !== -1) {
//     console.error('waybackurls is not installed on this system, skipping...').toString();
//     return null;
//   }
//   const output = execSync(`waybackurls ${domain}`);
//   return output;
// };