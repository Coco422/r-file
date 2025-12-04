import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useWebRTC } from '../hooks/useWebRTC';
import { useFileTransfer } from '../hooks/useFileTransfer';
import type { ServerMessage, FileTransfer } from '@r-file/shared';

type RoomState = 'idle' | 'creating' | 'joining' | 'waiting' | 'connecting' | 'connected';

export default function P2PRoom() {
  const { roomCode: urlRoomCode } = useParams<{ roomCode: string }>();
  const [roomState, setRoomState] = useState<RoomState>('idle');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState(urlRoomCode || '');
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [error, setError] = useState('');
  const [isHost, setIsHost] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const remotePeerIdRef = useRef('');

  // WebSocket hook
  const ws = useWebSocket();

  // WebRTC hooks
  const webrtc = useWebRTC({
    onDataChannelOpen: () => {
      setRoomState('connected');
    },
    onDataChannelClose: () => {
      setRoomState('waiting');
      setRemotePeerId('');
      remotePeerIdRef.current = '';
    },
    onDataChannelMessage: (data) => {
      fileTransfer.handleMessage(data);
    },
    onIceCandidate: (candidate) => {
      if (remotePeerIdRef.current) {
        ws.send({
          type: 'ice-candidate',
          candidate: candidate.toJSON(),
          targetId: remotePeerIdRef.current,
        });
      }
    },
  });

  // File transfer hook
  const fileTransfer = useFileTransfer({
    sendData: webrtc.sendData,
    getBufferedAmount: webrtc.getBufferedAmount,
  });

  // WebSocket message handler
  const handleServerMessage = useCallback(
    async (message: ServerMessage) => {
      console.log('[P2PRoom] Handling message:', message);
      switch (message.type) {
        case 'room-created':
          setRoomCode(message.roomCode);
          setPeerId(message.peerId);
          setRoomState('waiting');
          setIsHost(true);
          break;

        case 'room-joined':
          setRoomCode(message.roomCode);
          setPeerId(message.peerId);
          setRemotePeerId(message.hostId);
          remotePeerIdRef.current = message.hostId;
          setRoomState('connecting');
          setIsHost(false);
          // 访客创建 offer
          const offer = await webrtc.createOffer();
          ws.send({ type: 'offer', sdp: offer, targetId: message.hostId });
          break;

        case 'peer-joined':
          setRemotePeerId(message.peerId);
          remotePeerIdRef.current = message.peerId;
          setRoomState('connecting');
          break;

        case 'peer-left':
          setRemotePeerId('');
          remotePeerIdRef.current = '';
          webrtc.close();
          setRoomState('waiting');
          break;

        case 'offer':
          // 主人收到访客的 offer，创建 answer
          setRemotePeerId(message.fromId);
          remotePeerIdRef.current = message.fromId;
          const answer = await webrtc.createAnswer(message.sdp);
          ws.send({ type: 'answer', sdp: answer, targetId: message.fromId });
          break;

        case 'answer':
          // 访客收到主人的 answer
          await webrtc.setRemoteDescription(message.sdp);
          break;

        case 'ice-candidate':
          await webrtc.addIceCandidate(message.candidate);
          break;

        case 'error':
          setError(message.message);
          setRoomState('idle');
          break;
      }
    },
    [webrtc, ws]
  );

  // 设置消息处理器
  useEffect(() => {
    ws.setMessageHandler(handleServerMessage);
  }, [ws, handleServerMessage]);

  // 创建房间
  const handleCreateRoom = () => {
    setError('');
    setRoomState('creating');
    ws.connect(() => {
      // 连接成功后发送创建房间请求
      ws.send({ type: 'create-room' });
    });
  };

  // 加入房间
  const handleJoinRoom = () => {
    if (!joinCode.trim()) return;
    setError('');
    setRoomState('joining');
    ws.connect(() => {
      // 连接成功后发送加入房间请求
      ws.send({ type: 'join-room', roomCode: joinCode.toUpperCase() });
    });
  };

  // 离开房间
  const handleLeaveRoom = () => {
    ws.send({ type: 'leave-room' });
    ws.disconnect();
    webrtc.close();
    setRoomState('idle');
    setRoomCode('');
    setRemotePeerId('');
    remotePeerIdRef.current = '';
    setError('');
  };

  // 选择文件
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      fileTransfer.sendFile(file);
    }

    // 清空 input，允许重复选择同一文件
    e.target.value = '';
  };

  // 自动加入 URL 中的房间
  useEffect(() => {
    if (urlRoomCode && roomState === 'idle') {
      handleJoinRoom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlRoomCode]);

  // 渲染状态指示器
  const renderStatus = () => {
    const statusConfig = {
      idle: { color: 'gray', text: '未连接' },
      creating: { color: 'yellow', text: '创建中...' },
      joining: { color: 'yellow', text: '加入中...' },
      waiting: { color: 'blue', text: '等待对方加入' },
      connecting: { color: 'yellow', text: 'P2P 连接中...' },
      connected: { color: 'green', text: '已连接' },
    };

    const config = statusConfig[roomState];
    return (
      <span className={`inline-flex items-center gap-2 text-${config.color}-600`}>
        <span className={`w-2 h-2 rounded-full bg-${config.color}-500`}></span>
        {config.text}
      </span>
    );
  };

  // 渲染传输列表
  const renderTransfers = () => {
    if (fileTransfer.transfers.length === 0) return null;

    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">传输列表</h3>
          <button
            onClick={fileTransfer.clearCompleted}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            清除已完成
          </button>
        </div>
        <div className="space-y-2">
          {fileTransfer.transfers.map((transfer) => (
            <TransferItem key={transfer.id} transfer={transfer} />
          ))}
        </div>
      </div>
    );
  };

  // 空闲状态 - 选择创建或加入
  if (roomState === 'idle') {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6">P2P 文件传输</h1>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-6">{error}</div>
        )}

        <div className="space-y-6">
          {/* 创建房间 */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">创建房间</h2>
            <p className="text-gray-500 mb-4">创建一个新房间，邀请对方加入后即可传输文件</p>
            <button onClick={handleCreateRoom} className="btn btn-primary w-full">
              创建房间
            </button>
          </div>

          {/* 加入房间 */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">加入房间</h2>
            <p className="text-gray-500 mb-4">输入对方分享的房间码</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="input flex-1 font-mono uppercase"
                placeholder="输入房间码"
                maxLength={6}
              />
              <button
                onClick={handleJoinRoom}
                disabled={!joinCode.trim()}
                className="btn btn-primary"
              >
                加入
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 房间已创建/已加入
  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">P2P 文件传输</h1>
        <button onClick={handleLeaveRoom} className="text-red-600 hover:underline">
          离开房间
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500">房间码</p>
            <p className="text-2xl font-mono font-bold text-primary-600">{roomCode}</p>
          </div>
          {renderStatus()}
        </div>

        {roomState === 'waiting' && (
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-blue-700 mb-2">等待对方加入房间</p>
            <p className="text-sm text-blue-600">
              分享房间码 <span className="font-mono font-bold">{roomCode}</span> 给对方
            </p>
          </div>
        )}

        {roomState === 'connected' && (
          <>
            <div className="bg-green-50 rounded-lg p-4 text-center mb-4">
              <p className="text-green-700">连接成功，可以开始传输文件</p>
            </div>

            {/* 文件上传区域 */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors"
            >
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-gray-600">点击选择文件或拖拽文件到此处</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </>
        )}
      </div>

      {renderTransfers()}
    </div>
  );
}

// 传输项组件
function TransferItem({ transfer }: { transfer: FileTransfer }) {
  const statusText = {
    pending: '等待中',
    transferring: '传输中',
    completed: '已完成',
    cancelled: '已取消',
    error: '错误',
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={transfer.direction === 'upload' ? 'text-blue-600' : 'text-green-600'}>
            {transfer.direction === 'upload' ? '↑' : '↓'}
          </span>
          <span className="font-medium truncate max-w-[200px]">{transfer.name}</span>
        </div>
        <span className="text-sm text-gray-500">{formatSize(transfer.size)}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              transfer.status === 'completed' ? 'bg-green-500' : 'bg-primary-500'
            }`}
            style={{ width: `${transfer.progress}%` }}
          />
        </div>
        <span className="text-sm text-gray-500 w-20 text-right">
          {transfer.status === 'transferring'
            ? `${transfer.progress}%`
            : statusText[transfer.status]}
        </span>
      </div>
    </div>
  );
}
