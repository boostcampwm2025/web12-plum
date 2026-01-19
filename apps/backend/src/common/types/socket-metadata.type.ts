export interface SocketMetadata {
  roomId: string;
  participantId: string;
  transportIds: string[];
}

export interface SocketDeletionMetadata {
  socketId: string;
  roomId: string;
  transportIds: string[];
  timer: NodeJS.Timeout;
}
