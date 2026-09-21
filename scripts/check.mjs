import {readdir} from 'node:fs/promises';import {spawnSync} from 'node:child_process';
for(const folder of ['public','server','shared','scripts','api','tests'])for(const name of await readdir(folder)){if(!name.endsWith('.mjs'))continue;const result=spawnSync(process.execPath,['--check',`${folder}/${name}`],{encoding:'utf8'});if(result.status){console.error(result.stderr);process.exit(1);}}
console.log('Sintaxe JavaScript validada.');
