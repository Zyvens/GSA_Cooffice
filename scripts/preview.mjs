import {readFile,writeFile} from 'node:fs/promises';
const files=['shared/world.mjs','public/icons.mjs','public/map.mjs','public/realtime.mjs','public/app.mjs'];let script='window.GSA_STANDALONE=true;\n';
for(const path of files){script+=(await readFile(path,'utf8')).replace(/^import .*;\n/gm,'').replace(/^export /gm,'')+'\n';}
let html=await readFile('public/index.html','utf8');const css=(await readFile('public/style.css','utf8')).replace(/^@import[^;]+;\n?/,'');
html=html.replace('<link rel="stylesheet" href="./style.css">',()=>`<style>${css}</style>`).replace('<script type="module" src="./app.mjs"></script>',()=>`<script type="module">${script.replaceAll('</script','<\\/script')}</script>`);
await writeFile('../GSA-Coop-Previa.html',html);console.log('Prévia autônoma criada.');
