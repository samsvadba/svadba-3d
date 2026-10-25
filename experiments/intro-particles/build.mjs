// Builds only the isolated prototype into public/. Existing Vite/Pages stays untouched.
import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import { mkdir, copyFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const out=path.join(root,'.intro-particles-build');
await build({configFile:false,root,publicDir:false,base:'/svadba-3d/',build:{outDir:out,emptyOutDir:true,assetsDir:'experiments/intro-particles/assets',rollupOptions:{input:path.join(root,'intro-particles-test.html')}}});
const publicRoot=path.resolve(root,'public');
const ownedAssets=path.resolve(publicRoot,'experiments/intro-particles');
if(!ownedAssets.startsWith(publicRoot+path.sep))throw new Error('Prototype asset path escaped public directory');
await rm(ownedAssets,{recursive:true,force:true});
async function copyTree(from,to){await mkdir(to,{recursive:true});for(const entry of await readdir(from,{withFileTypes:true})){const source=path.join(from,entry.name),target=path.join(to,entry.name);if(entry.isDirectory())await copyTree(source,target);else await copyFile(source,target);}}
await copyTree(out,path.join(root,'public'));
console.log('Prototype artifacts ready. npm run build will copy them through the existing Pages pipeline.');
