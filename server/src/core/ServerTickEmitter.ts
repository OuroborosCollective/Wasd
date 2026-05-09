import { EventEmitter } from 'events';
export class ServerTickEmitter extends EventEmitter {}
export const serverTickEmitter = new ServerTickEmitter();
