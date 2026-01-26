import { ClientToServerEvents, FileInfo, ServerToClientEvents } from '@plum/shared-interfaces';
import { Socket } from 'socket.io-client';

export interface Participant {
  id: string;
  name: string;
}

export type MediaSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface PresentationFile extends FileInfo {
  name: string;
}
