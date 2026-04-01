import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

import { type GameEvent } from '@/utils/api';
import { useSession } from '@/utils/session';

export function useGameEvents(roomId: string, onEvent: (event: GameEvent) => void) {
  const { api, session } = useSession();
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!session.accessToken) {
      return;
    }

    const client = new Client({
      webSocketFactory: () =>
        new SockJS(`${api.baseUrl}/ws-game?access_token=${encodeURIComponent(session.accessToken ?? '')}`),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/game/${roomId}`, (message) => {
          onEventRef.current(JSON.parse(message.body) as GameEvent);
        });
        client.subscribe('/user/queue/game', (message) => {
          onEventRef.current(JSON.parse(message.body) as GameEvent);
        });
      },
    });

    client.activate();
    return () => {
      void client.deactivate();
    };
  }, [api.baseUrl, roomId, session.accessToken]);
}
