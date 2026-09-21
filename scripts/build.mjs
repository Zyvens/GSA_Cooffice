import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});await cp('public','dist',{recursive:true});await mkdir('dist/shared',{recursive:true});await cp('shared/world.mjs','dist/shared/world.mjs');
for(const file of ['app.mjs','map.mjs','realtime.mjs']){let s=await readFile(`dist/${file}`,'utf8');s=s.replaceAll("'../shared/world.mjs'","'./shared/world.mjs'");await writeFile(`dist/${file}`,s);}
console.log('Frontend compilado em dist. Backend em api/server.mjs.');
