import type { IncomingMessage, Server } from 'http'
import jwt from 'jsonwebtoken'
import type { WebSocket } from 'ws'
import { WebSocketServer } from 'ws'
import { getEnv } from '../config/env.js'
import { AuthUser } from '../middleware/authenticate.js'
import { registerClient } from './hub.js'

export function createRealtimeServer(httpServer: Server) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' })

  wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
    const url = new URL(request.url ?? '', `http://${request.headers.host ?? 'localhost'}`)
    const token = url.searchParams.get('token')

    if (!token) {
      socket.close(4001, 'Missing token')
      return
    }

    let payload: AuthUser
    try {
      payload = jwt.verify(token, getEnv().JWT_SECRET) as AuthUser
    } catch {
      socket.close(4001, 'Invalid or expired token')
      return
    }

    registerClient(socket, payload.id)
  })

  return wss
}
