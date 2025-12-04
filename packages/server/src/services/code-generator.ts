import { customAlphabet } from 'nanoid';

// 使用不易混淆的字符集
// 排除: 0, O, o, 1, l, I（易混淆字符）
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';

export const generateCode = customAlphabet(alphabet, 6);
export const generateRoomCode = customAlphabet(alphabet, 6);
