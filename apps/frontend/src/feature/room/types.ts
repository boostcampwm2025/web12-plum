export type Dialog = 'vote' | 'qna' | 'ranking';
export type SidePanel = 'chat' | 'info' | 'menu';

export interface MediaState {
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
}
