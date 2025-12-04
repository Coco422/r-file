import { useState, useCallback, useRef } from 'react';
import { FILE_CHUNK_SIZE, MAX_BUFFERED_AMOUNT, type FileTransfer } from '@r-file/shared';

interface UseFileTransferOptions {
  sendData: (data: ArrayBuffer | string) => void;
  getBufferedAmount: () => number;
}

export function useFileTransfer({ sendData, getBufferedAmount }: UseFileTransferOptions) {
  const [transfers, setTransfers] = useState<FileTransfer[]>([]);
  const receivingFilesRef = useRef<Map<string, { meta: FileTransfer; chunks: ArrayBuffer[] }>>(
    new Map()
  );

  // 发送文件
  const sendFile = useCallback(
    async (file: File) => {
      const id = Math.random().toString(36).substring(2, 15);

      const transfer: FileTransfer = {
        id,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        progress: 0,
        status: 'pending',
        direction: 'upload',
      };

      setTransfers((prev) => [...prev, transfer]);

      // 发送文件元数据
      const meta = {
        type: 'file-meta',
        id,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
      };
      sendData(JSON.stringify(meta));

      // 开始传输
      setTransfers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'transferring' } : t))
      );

      const totalChunks = Math.ceil(file.size / FILE_CHUNK_SIZE);
      const arrayBuffer = await file.arrayBuffer();

      for (let i = 0; i < totalChunks; i++) {
        const start = i * FILE_CHUNK_SIZE;
        const end = Math.min(start + FILE_CHUNK_SIZE, file.size);
        const chunk = arrayBuffer.slice(start, end);

        // 等待缓冲区清空
        while (getBufferedAmount() > MAX_BUFFERED_AMOUNT) {
          await new Promise((r) => setTimeout(r, 50));
        }

        // 发送 chunk 元数据
        const chunkMeta = { type: 'file-chunk', id, index: i };
        sendData(JSON.stringify(chunkMeta));

        // 发送 chunk 数据
        sendData(chunk);

        // 更新进度
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, progress } : t)));
      }

      // 发送完成消息
      sendData(JSON.stringify({ type: 'file-complete', id }));

      setTransfers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'completed', progress: 100 } : t))
      );
    },
    [sendData, getBufferedAmount]
  );

  // 处理接收到的消息
  const handleMessage = useCallback((data: ArrayBuffer | string) => {
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);

        if (msg.type === 'file-meta') {
          // 开始接收新文件
          const transfer: FileTransfer = {
            id: msg.id,
            name: msg.name,
            size: msg.size,
            mimeType: msg.mimeType,
            progress: 0,
            status: 'transferring',
            direction: 'download',
          };

          receivingFilesRef.current.set(msg.id, { meta: transfer, chunks: [] });
          setTransfers((prev) => [...prev, transfer]);
        } else if (msg.type === 'file-chunk') {
          // 准备接收 chunk（下一条 binary 消息）
          const receiving = receivingFilesRef.current.get(msg.id);
          if (receiving) {
            receiving.meta = { ...receiving.meta, _expectingChunk: msg.index } as any;
          }
        } else if (msg.type === 'file-complete') {
          // 文件接收完成，触发下载
          const receiving = receivingFilesRef.current.get(msg.id);
          if (receiving) {
            const blob = new Blob(receiving.chunks, { type: receiving.meta.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = receiving.meta.name;
            a.click();
            URL.revokeObjectURL(url);

            setTransfers((prev) =>
              prev.map((t) =>
                t.id === msg.id ? { ...t, status: 'completed', progress: 100 } : t
              )
            );

            receivingFilesRef.current.delete(msg.id);
          }
        }
      } catch (err) {
        console.error('[FileTransfer] Failed to parse message:', err);
      }
    } else {
      // Binary data (file chunk)
      for (const [id, receiving] of receivingFilesRef.current) {
        if ((receiving.meta as any)._expectingChunk !== undefined) {
          receiving.chunks.push(data);
          delete (receiving.meta as any)._expectingChunk;

          // 更新进度
          const totalChunks = Math.ceil(receiving.meta.size / FILE_CHUNK_SIZE);
          const progress = Math.round((receiving.chunks.length / totalChunks) * 100);

          setTransfers((prev) =>
            prev.map((t) => (t.id === id ? { ...t, progress } : t))
          );
          break;
        }
      }
    }
  }, []);

  const clearCompleted = useCallback(() => {
    setTransfers((prev) => prev.filter((t) => t.status !== 'completed'));
  }, []);

  return {
    transfers,
    sendFile,
    handleMessage,
    clearCompleted,
  };
}
