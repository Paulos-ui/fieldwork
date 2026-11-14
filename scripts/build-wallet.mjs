import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
await build({
 tsconfigRaw:{},
 entryPoints:['scripts/wallet-provider.js'],
 outfile:'public/wallet-provider.bundle.js',
 bundle:true,format:'esm',platform:'browser',target:['es2022'],minify:true,
 inject:[resolve('scripts/browser-shim.js')],
 define:{global:'globalThis','process.env.NODE_ENV':'"production"'}
});
const entry=await readFile('scripts/wallet-entry.js','utf8');
const version=createHash('sha256').update(await readFile('public/wallet-provider.bundle.js')).update(entry).digest('hex').slice(0,12);
await writeFile('public/wallet.bundle.js',entry.replaceAll('__WALLET_PROVIDER_VERSION__',version));
const html=await readFile('public/fieldwork.html','utf8');
await writeFile('public/fieldwork.html',html.replace(/wallet\.bundle\.js(?:\?v=[^"]*)?/,'wallet.bundle.js?v='+version));
console.log('Built wallet chooser and NEAR adapters.');
