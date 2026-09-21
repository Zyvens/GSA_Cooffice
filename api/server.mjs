import http from 'node:http';
import {Repository} from '../server/db.mjs';
import {createHandler} from '../server/http.mjs';
import {attachRealtime} from '../server/realtime.mjs';
const repo=new Repository();
const server=http.createServer(createHandler(repo));
attachRealtime(server,repo);
export default server;
