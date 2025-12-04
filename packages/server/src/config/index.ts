import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  databasePath: process.env.DATABASE_PATH || './data/r-file.db',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  maxTextSize: parseInt(process.env.MAX_TEXT_SIZE || '10240', 10),
  defaultExpiresMinutes: parseInt(process.env.DEFAULT_EXPIRES_MINUTES || '60', 10),
  roomCodeLength: parseInt(process.env.ROOM_CODE_LENGTH || '6', 10),
  roomExpiresMinutes: parseInt(process.env.ROOM_EXPIRES_MINUTES || '60', 10),
};
