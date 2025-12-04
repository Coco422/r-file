import { useRef, useState, useCallback } from 'react';
import { RTC_CONFIG } from '@r-file/shared';

type RTCConnectionState = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

interface UseWebRTCOptions {
  onDataChannelOpen?: () => void;
  onDataChannelClose?: () => void;
  onDataChannelMessage?: (data: ArrayBuffer | string) => void;
  onIceCandidate?: (candidate: RTCIceCandidate) => void;
}

export function useWebRTC(options: UseWebRTCOptions = {}) {
  const [connectionState, setConnectionState] = useState<RTCConnectionState>('new');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState as RTCConnectionState);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        options.onIceCandidate?.(event.candidate);
      }
    };

    pc.ondatachannel = (event) => {
      setupDataChannel(event.channel);
    };

    return pc;
  }, [options]);

  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    dcRef.current = channel;
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      options.onDataChannelOpen?.();
    };

    channel.onclose = () => {
      options.onDataChannelClose?.();
    };

    channel.onmessage = (event) => {
      options.onDataChannelMessage?.(event.data);
    };
  }, [options]);

  const createOffer = useCallback(async (): Promise<RTCSessionDescriptionInit> => {
    const pc = createPeerConnection();

    // 创建 DataChannel（必须在 createOffer 之前）
    const channel = pc.createDataChannel('file-transfer', { ordered: true });
    setupDataChannel(channel);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    return offer;
  }, [createPeerConnection, setupDataChannel]);

  const createAnswer = useCallback(
    async (offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> => {
      const pc = createPeerConnection();

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      return answer;
    },
    [createPeerConnection]
  );

  const setRemoteDescription = useCallback(async (desc: RTCSessionDescriptionInit) => {
    if (!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(desc));
  }, []);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!pcRef.current) return;
    await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
  }, []);

  const sendData = useCallback((data: ArrayBuffer | string) => {
    if (dcRef.current?.readyState === 'open') {
      dcRef.current.send(data as any);
    }
  }, []);

  const getBufferedAmount = useCallback(() => {
    return dcRef.current?.bufferedAmount ?? 0;
  }, []);

  const close = useCallback(() => {
    dcRef.current?.close();
    pcRef.current?.close();
    dcRef.current = null;
    pcRef.current = null;
    setConnectionState('closed');
  }, []);

  return {
    connectionState,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    sendData,
    getBufferedAmount,
    close,
  };
}
