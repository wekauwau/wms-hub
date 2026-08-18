import type { WebSocket } from 'ws'

interface Client {
  socket: WebSocket
  userId: string
}

const clients = new Set<Client>()

export function registerClient(socket: WebSocket, userId: string) {
  const client: Client = { socket, userId }
  clients.add(client)
  socket.on('close', () => {
    clients.delete(client)
  })
}

export function sendToClient(socket: WebSocket, type: string, data: unknown) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify({ type, data }))
  }
}

export function broadcast(type: string, data: unknown) {
  const message = JSON.stringify({ type, data })
  for (const client of clients) {
    if (client.socket.readyState === client.socket.OPEN) {
      client.socket.send(message)
    }
  }
}

export function sendToUser(userId: string, type: string, data: unknown) {
  const message = JSON.stringify({ type, data })
  for (const client of clients) {
    if (client.userId === userId && client.socket.readyState === client.socket.OPEN) {
      client.socket.send(message)
    }
  }
}

export function connectionCount() {
  return clients.size
}

export function clientsForTesting() {
  return clients
}
