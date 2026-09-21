import {readFile} from 'node:fs/promises';
import {getPool} from '../server/db.mjs';
if(!process.env.DATABASE_URL)throw Error('Configure DATABASE_URL antes de migrar.');
const pool=getPool();await pool.query(await readFile(new URL('../server/schema.sql',import.meta.url),'utf8'));await pool.end();console.log('Schema GSA criado sem alterar tabelas de outros aplicativos.');
