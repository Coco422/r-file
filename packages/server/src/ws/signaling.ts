import { WebSocket } from 'ws';
import { roomManager } from './room-manager.js';
import type {
  ClientMessage,
  ServerMessage,
  SignalingErrorCode,
} from '@r-file/shared';

// 生成简单的 peer ID
function generatePeerId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// 加入失败追踪（防暴力枚举）
const joinFailures = new Map<string, { count: number; blockedUntil: number }>();
const MAX_JOIN_FAILURES = 5;           // 最大失败次数
const BLOCK_DURATION_MS = 5 * 60 * 1000;  // 封禁 5 分钟
const FAILURE_WINDOW_MS = 60 * 1000;   // 1 分钟内计数

function checkJoinBlocked(peerId: string): boolean {
  const record = joinFailures.get(peerId);
  if (!record) return false;

  if (Date.now() < record.blockedUntil) {
    return true;
  }

  // 封禁已过期，清除记录
  joinFailures.delete(peerId);
  return false;
}

function recordJoinFailure(peerId: string): void {
  const now = Date.now();
  const record = joinFailures.get(peerId);

  if (!record || now > record.blockedUntil + FAILURE_WINDOW_MS) {
    joinFailures.set(peerId, { count: 1, blockedUntil: 0 });
    return;
  }

  record.count++;
  if (record.count >= MAX_JOIN_FAILURES) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    console.log(`[Signaling] Peer ${peerId} 被封禁 5 分钟（连续加入失败）`);
  }
}

// 发送消息
function send(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// 发送错误
function sendError(ws: WebSocket, code: string, message: string) {
  send(ws, { type: 'error', code, message });
}

export function handleSignaling(ws: WebSocket) {
  const peerId = generatePeerId();

  ws.on('message', (data) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      handleMessage(ws, peerId, message);
    } catch (error) {
      sendError(ws, 'INVALID_MESSAGE', '无效的消息格式');
    }
  });

  ws.on('close', () => {
    handleDisconnect(peerId);
  });

  ws.on('error', (error) => {
    console.error(`[Signaling] WebSocket error for peer ${peerId}:`, error);
    handleDisconnect(peerId);
  });
}

function handleMessage(ws: WebSocket, peerId: string, message: ClientMessage) {
  switch (message.type) {
    case 'create-room':
      handleCreateRoom(ws, peerId);
      break;
    case 'join-room':
      handleJoinRoom(ws, peerId, message.roomCode);
      break;
    case 'leave-room':
      handleLeaveRoom(peerId);
      break;
    case 'offer':
      handleOffer(peerId, message.sdp, message.targetId);
      break;
    case 'answer':
      handleAnswer(peerId, message.sdp, message.targetId);
      break;
    case 'ice-candidate':
      handleIceCandidate(peerId, message.candidate, message.targetId);
      break;
    default:
      sendError(ws, 'INVALID_MESSAGE', '未知的消息类型');
  }
}

function handleCreateRoom(ws: WebSocket, peerId: string) {
  try {
    const roomCode = roomManager.createRoom(peerId, ws);
    send(ws, { type: 'room-created', roomCode, peerId });
    console.log(`[Signaling] Room created: ${roomCode} by peer ${peerId}`);
  } catch (error: any) {
    sendError(ws, error.code || 'CREATE_FAILED', error.message || '创建房间失败');
  }
}

function handleJoinRoom(ws: WebSocket, peerId: string, roomCode: string) {
  // 检查是否被封禁
  if (checkJoinBlocked(peerId)) {
    sendError(ws, 'BLOCKED', '操作过于频繁，请稍后再试');
    return;
  }

  try {
    const room = roomManager.joinRoom(roomCode, peerId, ws);

    // 通知加入者
    send(ws, {
      type: 'room-joined',
      roomCode,
      peerId,
      hostId: room.host.id,
    });

    // 通知主人有人加入
    send(room.host.ws, {
      type: 'peer-joined',
      peerId,
    });

    console.log(`[Signaling] Peer ${peerId} joined room ${roomCode}`);
  } catch (error: any) {
    // 记录失败
    if (error.code === 'ROOM_NOT_FOUND') {
      recordJoinFailure(peerId);
    }
    sendError(ws, error.code || 'JOIN_FAILED', error.message || '加入房间失败');
  }
}

function handleLeaveRoom(peerId: string) {
  const result = roomManager.leaveRoom(peerId);
  if (!result) return;

  const { room, wasHost } = result;

  if (wasHost && room.guest) {
    // 通知访客主人离开了
    send(room.guest.ws, { type: 'peer-left', peerId });
  } else if (!wasHost) {
    // 通知主人访客离开了
    send(room.host.ws, { type: 'peer-left', peerId });
  }

  console.log(`[Signaling] Peer ${peerId} left room ${room.code}`);
}

function handleDisconnect(peerId: string) {
  handleLeaveRoom(peerId);
}

function handleOffer(
  fromId: string,
  sdp: RTCSessionDescriptionInit,
  targetId: string
) {
  const room = roomManager.getRoomByPeer(fromId);
  if (!room) return;

  const targetPeer =
    room.host.id === targetId ? room.host : room.guest?.id === targetId ? room.guest : null;

  if (targetPeer) {
    send(targetPeer.ws, { type: 'offer', sdp, fromId });
  }
}

function handleAnswer(
  fromId: string,
  sdp: RTCSessionDescriptionInit,
  targetId: string
) {
  const room = roomManager.getRoomByPeer(fromId);
  if (!room) return;

  const targetPeer =
    room.host.id === targetId ? room.host : room.guest?.id === targetId ? room.guest : null;

  if (targetPeer) {
    send(targetPeer.ws, { type: 'answer', sdp, fromId });
  }
}

function handleIceCandidate(
  fromId: string,
  candidate: RTCIceCandidateInit,
  targetId: string
) {
  const room = roomManager.getRoomByPeer(fromId);
  if (!room) return;

  const targetPeer =
    room.host.id === targetId ? room.host : room.guest?.id === targetId ? room.guest : null;

  if (targetPeer) {
    send(targetPeer.ws, { type: 'ice-candidate', candidate, fromId });
  }
}
