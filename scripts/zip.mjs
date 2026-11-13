import {readFile,writeFile,readdir,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {crc32,deflateRawSync,inflateRawSync} from 'node:zlib';
import {randomUUID} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const target=path.resolve(process.argv[2] || path.join(root,'../Fieldwork.zip'));
const files=['package.json','README.md','.gitignore','server.mjs'];
if((await readdir(root)).includes('package-lock.json'))files.push('package-lock.json');
async function collect(dir){
  for(const entry of await readdir(path.join(root,dir),{withFileTypes:true})){
    const file=dir+'/'+entry.name;
    if(entry.isDirectory())await collect(file);
    else if(entry.isFile())files.push(file);
  }
}
for(const dir of ['app','public','tests','scripts'])await collect(dir);
const parts=[],directory=[];let offset=0;
for(const file of files.sort()){
  const name=Buffer.from('filed work/'+file);
  const raw=await readFile(path.join(root,file)),compressed=deflateRawSync(raw);
  if(!inflateRawSync(compressed).equals(raw))throw Error('Compression failed for '+file);
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);
  header.writeUInt16LE(20,4);header.writeUInt16LE(8,8);header.writeUInt16LE(0x5d6c,12);
  header.writeUInt32LE(crc32(raw),14);header.writeUInt32LE(compressed.length,18);
  header.writeUInt32LE(raw.length,22);header.writeUInt16LE(name.length,26);
  const index=Buffer.alloc(46);index.writeUInt32LE(0x02014b50);index.writeUInt16LE(20,4);
  header.copy(index,6,4,30);index.writeUInt32LE(offset,42);
  parts.push(header,name,compressed);directory.push(index,name);
  offset+=header.length+name.length+compressed.length;
}
const table=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);
end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);
end.writeUInt32LE(table.length,12);end.writeUInt32LE(offset,16);
const temp=target+'.'+randomUUID()+'.tmp';const archive=Buffer.concat([...parts,table,end]);
await writeFile(temp,archive);await rename(temp,target);
if(!(await readFile(target)).equals(archive))throw Error('Archive verification failed');
console.log(target+' · '+files.length+' files · '+archive.length+' bytes');
