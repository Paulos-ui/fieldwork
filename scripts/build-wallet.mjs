import {build} from 'esbuild';
await build({tsconfigRaw:{},entryPoints:['scripts/wallet-entry.js'],bundle:true,outfile:'public/wallet.bundle.js',format:'iife',platform:'browser',target:['es2022'],minify:true,define:{'process.env.NODE_ENV':'"production"'}});
