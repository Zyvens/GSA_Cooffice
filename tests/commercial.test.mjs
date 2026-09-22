import test from 'node:test';
import assert from 'node:assert/strict';
import {projectPrice,CHANNEL_RULES} from '../server/commercial.mjs';

test('Preço oficial do Projeto Executivo escala por ambientes',()=>{
 assert.deepEqual(projectPrice(3),{environments:3,porte:'Compacto',project_cents:190000,label:'preço fechado do Projeto Executivo',source:'05 · Precificação — escada por ambiente',execution_status:'referência não homologada',warning:'A escada do Projeto é decisão fechada. A escada de execução precisa ser validada contra obra real antes de entrar em proposta.'});
 assert.equal(projectPrice(5).project_cents,290000);
 assert.equal(projectPrice(9).project_cents,440000);
 assert.equal(projectPrice(14).project_cents,660000);
 assert.equal(projectPrice(20).project_cents,900000);
 assert.equal(projectPrice(20).label,'a partir de');
 assert.throws(()=>projectPrice(0));
});

test('Canais comerciais não misturam outbound e BNI',()=>{
 assert.match(CHANNEL_RULES.outbound,/Airbnb/);
 assert.match(CHANNEL_RULES.BNI,/Envelhecimento em casa/);
 assert.match(CHANNEL_RULES.proposal,/duas opções/);
});
