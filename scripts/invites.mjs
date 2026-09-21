import {randomBytes} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
const body=['INVITE_VITOR','INVITE_FABIO'].map(k=>`${k}=${randomBytes(32).toString('base64url')}`).join('\n')+'\n';
await writeFile('.env.invites',body,{mode:0o600,flag:'wx'});console.log('Convites salvos em .env.invites. Configure-os na Vercel e entregue cada convite somente ao respectivo sócio. O arquivo não é incluído no Git.');
