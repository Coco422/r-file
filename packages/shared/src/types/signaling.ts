// ============ 客户端发送的消息 ============

export interface CreateRoomMessage {
  type: 'create-room';
}

export interface JoinRoomMessage {
  type: 'join-room';
  roomCode: string;
}

export interface LeaveRoomMessage {
  type: 'leave-room';
}

export interface OfferMessage {
  type: 'offer';
  sdp: RTCSessionDescriptionInit;
  targetId: string;
}

export interface AnswerMessage {
  type: 'answer';
  sdp: RTCSessionDescriptionInit;
  targetId: string;
}

export interface IceCandidateMessage {
  type: 'ice-candidate';
  candidate: RTCIceCandidateInit;
  targetId: string;
}

export type ClientMessage =
  | CreateRoomMessage
  | JoinRoomMessage
  | LeaveRoomMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage;

// ============ 服务端发送的消息 ============

export interface RoomCreatedMessage {
  type: 'room-created';
  roomCode: string;
  peerId: string;
}

export interface RoomJoinedMessage {
  type: 'room-joined';
  roomCode: string;
  peerId: string;
  hostId: string;
}

export interface PeerJoinedMessage {
  type: 'peer-joined';
  peerId: string;
}

export interface PeerLeftMessage {
  type: 'peer-left';
  peerId: string;
}

export interface ServerOfferMessage {
  type: 'offer';
  sdp: RTCSessionDescriptionInit;
  fromId: string;
}

export interface ServerAnswerMessage {
  type: 'answer';
  sdp: RTCSessionDescriptionInit;
  fromId: string;
}

export interface ServerIceCandidateMessage {
  type: 'ice-candidate';
  candidate: RTCIceCandidateInit;
  fromId: string;
}

export interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
}

export type ServerMessage =
  | RoomCreatedMessage
  | RoomJoinedMessage
  | PeerJoinedMessage
  | PeerLeftMessage
  | ServerOfferMessage
  | ServerAnswerMessage
  | ServerIceCandidateMessage
  | ErrorMessage;

// ============ 信令错误码 ============

export const SignalingErrorCodes = {
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_FULL: 'ROOM_FULL',
  PEER_NOT_FOUND: 'PEER_NOT_FOUND',
  INVALID_MESSAGE: 'INVALID_MESSAGE',
  ALREADY_IN_ROOM: 'ALREADY_IN_ROOM',
  NOT_IN_ROOM: 'NOT_IN_ROOM',
} as const;

export type SignalingErrorCode = (typeof SignalingErrorCodes)[keyof typeof SignalingErrorCodes];

// ============ DataChannel 文件传输协议 ============

export interface FileMetaMessage {
  type: 'file-meta';
  id: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface FileChunkMessage {
  type: 'file-chunk';
  id: string;
  index: number;
  // chunk data is sent as ArrayBuffer separately
}

export interface FileCompleteMessage {
  type: 'file-complete';
  id: string;
}

export interface FileCancelMessage {
  type: 'file-cancel';
  id: string;
}

export type DataChannelMessage =
  | FileMetaMessage
  | FileChunkMessage
  | FileCompleteMessage
  | FileCancelMessage;

// ============ 文件传输状态 ============

export interface FileTransfer {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  progress: number; // 0-100
  status: 'pending' | 'transferring' | 'completed' | 'cancelled' | 'error';
  direction: 'upload' | 'download';
  chunks?: ArrayBuffer[];
}
