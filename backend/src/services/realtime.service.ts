import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import { WebSocket, WebSocketServer } from 'ws';
import type { JwtPayload } from '../controllers/auth.controller';

export type RealtimeEvent = { type: string; resource: string; timestamp: number; payload?: Record<string, unknown> };
type Client = WebSocket & { user?: JwtPayload };
const clients = new Set<Client>();

export function initializeRealtime(server: Server) {
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (request, socket, head) => {
    if (!request.url?.startsWith('/ws')) return socket.destroy();
    const token = request.headers['sec-websocket-protocol']?.split(',').map(value => value.trim()).find(value => value !== 'unimartx');
    if (!token) return socket.destroy();
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      wss.handleUpgrade(request, socket, head, (ws) => {
        const client = ws as Client;
        client.user = user;
        clients.add(client);
        client.send(JSON.stringify({ type: 'connection.ready', resource: 'system', timestamp: Date.now() }));
        client.on('close', () => clients.delete(client));
        client.on('error', () => clients.delete(client));
      });
    } catch { socket.destroy(); }
  });
}

export function emitToUser(userId: string, event: RealtimeEvent) {
  const message = JSON.stringify(event);
  for (const client of clients) if (client.user?.userId === userId && client.readyState === WebSocket.OPEN) client.send(message);
}

export function emitToRole(role: JwtPayload['role'], event: RealtimeEvent) {
  const message = JSON.stringify(event);
  for (const client of clients) if (client.user?.role === role && client.readyState === WebSocket.OPEN) client.send(message);
}
