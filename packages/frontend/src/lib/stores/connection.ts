import { writable } from 'svelte/store';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'version_mismatch'
  | 'mock';

export const connectionStatus = writable<ConnectionStatus>('connecting');
