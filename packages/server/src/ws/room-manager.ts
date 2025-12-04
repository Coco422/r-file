import { generateRoomCode } from '../services/code-generator.js';

interface Peer {
  id: string;
  ws: any; // WebSocket
}

interface Room {
  code: string;
  host: Peer;
  guest: Peer | null;
  createdAt: Date;
}

class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private peerToRoom: Map<string, string> = new Map();

  createRoom(peerId: string, ws: any): string {
    // 检查是否已在房间中
    if (this.peerToRoom.has(peerId)) {
      throw { code: 'ALREADY_IN_ROOM', message: '已在房间中' };
    }

    // 生成唯一房间码
    let code = generateRoomCode();
    let attempts = 0;
    while (this.rooms.has(code) && attempts < 10) {
      code = generateRoomCode();
      attempts++;
    }

    const room: Room = {
      code,
      host: { id: peerId, ws },
      guest: null,
      createdAt: new Date(),
    };

    this.rooms.set(code, room);
    this.peerToRoom.set(peerId, code);

    return code;
  }

  joinRoom(roomCode: string, peerId: string, ws: any): Room {
    const room = this.rooms.get(roomCode);

    if (!room) {
      throw { code: 'ROOM_NOT_FOUND', message: '房间不存在' };
    }

    if (room.guest) {
      throw { code: 'ROOM_FULL', message: '房间已满' };
    }

    if (this.peerToRoom.has(peerId)) {
      throw { code: 'ALREADY_IN_ROOM', message: '已在房间中' };
    }

    room.guest = { id: peerId, ws };
    this.peerToRoom.set(peerId, roomCode);

    return room;
  }

  leaveRoom(peerId: string): { room: Room; wasHost: boolean } | null {
    const roomCode = this.peerToRoom.get(peerId);
    if (!roomCode) return null;

    const room = this.rooms.get(roomCode);
    if (!room) return null;

    this.peerToRoom.delete(peerId);

    const wasHost = room.host.id === peerId;

    if (wasHost) {
      // 主人离开，整个房间关闭
      if (room.guest) {
        this.peerToRoom.delete(room.guest.id);
      }
      this.rooms.delete(roomCode);
    } else {
      // 访客离开
      room.guest = null;
    }

    return { room, wasHost };
  }

  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode);
  }

  getRoomByPeer(peerId: string): Room | undefined {
    const roomCode = this.peerToRoom.get(peerId);
    if (!roomCode) return undefined;
    return this.rooms.get(roomCode);
  }

  getPeer(roomCode: string, peerId: string): Peer | undefined {
    const room = this.rooms.get(roomCode);
    if (!room) return undefined;
    if (room.host.id === peerId) return room.host;
    if (room.guest?.id === peerId) return room.guest;
    return undefined;
  }

  // 清理过期房间（超过 1 小时）
  cleanup(): number {
    const now = Date.now();
    const expireTime = 60 * 60 * 1000; // 1 小时
    let count = 0;

    for (const [code, room] of this.rooms) {
      if (now - room.createdAt.getTime() > expireTime) {
        this.peerToRoom.delete(room.host.id);
        if (room.guest) {
          this.peerToRoom.delete(room.guest.id);
        }
        this.rooms.delete(code);
        count++;
      }
    }

    return count;
  }
}

export const roomManager = new RoomManager();

// 定时清理过期房间
setInterval(() => {
  const cleaned = roomManager.cleanup();
  if (cleaned > 0) {
    console.log(`[RoomManager] 清理了 ${cleaned} 个过期房间`);
  }
}, 5 * 60 * 1000); // 5 分钟
