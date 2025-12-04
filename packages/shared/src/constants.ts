// 过期时间选项（分钟）
export const EXPIRES_OPTIONS = [30, 60, 1440] as const;
export type ExpiresOption = (typeof EXPIRES_OPTIONS)[number];

// 文本分享限制
export const MAX_TEXT_SIZE = 10 * 1024; // 10KB
export const CODE_LENGTH = 6;

// 房间配置
export const ROOM_CODE_LENGTH = 6;
export const ROOM_EXPIRES_MINUTES = 60;

// WebRTC 配置
export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // 免费 TURN 服务器（Open Relay Project）
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

// 文件传输配置
export const FILE_CHUNK_SIZE = 16 * 1024; // 16KB per chunk
export const MAX_BUFFERED_AMOUNT = 16 * 1024 * 1024; // 16MB buffer threshold
