import { customAlphabet } from 'nanoid';

// 使用不易混淆的字符集（仅大写）
// 排除: 0, O, 1, I（易混淆字符）
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const generateCode = customAlphabet(alphabet, 6);
export const generateRoomCode = customAlphabet(alphabet, 6);
