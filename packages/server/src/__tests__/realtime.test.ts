import http from 'http'
import jwt from 'jsonwebtoken'
import { AddressInfo } from 'net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import WebSocket from 'ws'
import app from '../app.js'
import { getEnv } from '../config/env.js'
import { emitEvent } from '../realtime/events.js'
import { connectionCount } from '../realtime/hub.js'
import { createRealtimeServer } from '../realtime/server.js'

function connect(port: number, token?: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const url = `ws://localhost:${port}/ws${token ? `?token=${token}` : ''}`
    const ws = new WebSocket(url)
    ws.on('open', () => resolve(ws))
    ws.on('error', reject)
  })
}

function closeAndWait(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    ws.on('close', () => resolve())
    ws.close()
  })
}

function expectClosed(ws: WebSocket, code: number): Promise<void> {
  return new Promise((resolve) => {
    ws.on('close', (receivedCode) => {
      expect(receivedCode).toBe(code)
      resolve()
    })
  })
}

describe('Realtime WebSocket', () => {
  let server: http.Server
  let port = 0
  let validToken = ''

  beforeAll(async () => {
    server = http.createServer(app)
    createRealtimeServer(server)
    await new Promise<void>((resolve) => server.listen(0, resolve))
    port = (server.address() as AddressInfo).port

    validToken = jwt.sign(
      { id: '1', email: 'admin@wms.local', roles: ['admin'], permissions: [], warehouseIds: [] },
      getEnv().JWT_SECRET,
      { expiresIn: '15m' },
    )
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('rejects a connection with no token', async () => {
    const ws = await connect(port)
    const closed = expectClosed(ws, 4001)
    await closed
  })

  it('rejects a connection with an invalid token', async () => {
    const ws = await connect(port, 'not-a-valid-token')
    const closed = expectClosed(ws, 4001)
    await closed
  })

  it('accepts a connection with a valid token', async () => {
    const ws = await connect(port, validToken)
    expect(ws.readyState).toBe(WebSocket.OPEN)
    await closeAndWait(ws)
  })

  it('tracks connections per user', async () => {
    const before = connectionCount()
    const ws = await connect(port, validToken)
    expect(connectionCount()).toBe(before + 1)
    await closeAndWait(ws)
  })

  it('broadcasts events to connected clients', async () => {
    const ws = await connect(port, validToken)

    const message = new Promise<string>((resolve) => {
      ws.on('message', (data) => resolve(data.toString()))
    })

    emitEvent({
      type: 'po.received',
      data: { poId: '1', lineId: '1' },
    })

    const payload = JSON.parse(await message)
    expect(payload.type).toBe('po.received')
    expect(payload.data.poId).toBe('1')

    await closeAndWait(ws)
  })
})
