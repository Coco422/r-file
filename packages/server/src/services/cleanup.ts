import { db } from '../db/index.js';

// 清理过期的分享
export function cleanupExpiredShares(): number {
  const result = db.prepare("DELETE FROM text_shares WHERE expires_at < datetime('now')").run();
  return result.changes;
}

// 启动定时清理（每 5 分钟）
export function startCleanupScheduler() {
  // 立即执行一次
  const cleaned = cleanupExpiredShares();
  if (cleaned > 0) {
    console.log(`[Cleanup] 清理了 ${cleaned} 条过期分享`);
  }

  // 定时执行
  setInterval(() => {
    const cleaned = cleanupExpiredShares();
    if (cleaned > 0) {
      console.log(`[Cleanup] 清理了 ${cleaned} 条过期分享`);
    }
  }, 5 * 60 * 1000); // 5 分钟
}
