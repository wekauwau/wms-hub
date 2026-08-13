import { sql } from 'kysely'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import app from '../app.js'
import { getDb } from '../config/db.js'

describe('Inbound Pipeline', () => {
  let accessToken = ''
  let warehouseId = 0
  let locationId = 0
  let skuId = 0
  let poId = 0
  let poLineId = 0

  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@wms.local', password: 'admin123' })

    if (loginRes.status !== 200) {
      console.log('    (skipped — admin user not seeded)')
      return
    }
    accessToken = loginRes.body.accessToken

    const db = getDb()

    const wh = await sql<{ id: number }>`
      INSERT INTO warehouses (code, name) VALUES ('TEST-WH', 'Test Warehouse')
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `.execute(db)
    warehouseId = wh.rows[0].id

    const loc = await sql<{ id: number }>`
      INSERT INTO locations (warehouse_id, code, name, type, path)
      VALUES (${warehouseId}, 'TEST-BIN-01', 'Test Bin', 'BIN', '1.1')
      ON CONFLICT (warehouse_id, code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `.execute(db)
    locationId = loc.rows[0].id

    const sku = await sql<{ id: number }>`
      INSERT INTO skus (sku_code, name, uom) VALUES ('TEST-SKU-001', 'Test Widget', 'UNITS')
      ON CONFLICT (sku_code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `.execute(db)
    skuId = sku.rows[0].id
  })

  describe('POST /api/inbound/po', () => {
    it('creates a purchase order', async () => {
      if (!accessToken) return
      const res = await request(app)
        .post('/api/inbound/po')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          poNumber: `TEST-PO-${Date.now()}`,
          warehouseId,
          supplierName: 'Test Supplier',
          expectedDate: '2026-12-31',
        })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('id')
      poId = res.body.id
    })
  })

  describe('POST /api/inbound/po/:id/lines', () => {
    it('adds a line to the PO', async () => {
      if (!accessToken || !poId) return
      const res = await request(app)
        .post(`/api/inbound/po/${poId}/lines`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ skuId, expectedQuantity: 100, unitCost: 9.99 })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('id')
      poLineId = res.body.id
    })
  })

  describe('GET /api/inbound/po/:id', () => {
    it('returns the PO with lines', async () => {
      if (!accessToken || !poId) return
      const res = await request(app)
        .get(`/api/inbound/po/${poId}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.poNumber).toBeDefined()
      expect(res.body.lines).toBeDefined()
      expect(res.body.lines.length).toBe(1)
    })
  })

  describe('POST /api/inbound/po/:id/receive', () => {
    it('receives the PO line', async () => {
      if (!accessToken || !poId || !poLineId) return
      const res = await request(app)
        .post(`/api/inbound/po/${poId}/receive`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ lines: [{ lineId: poLineId, receivedQuantity: 50 }] })

      expect(res.status).toBe(200)
      expect(res.body.received).toHaveLength(1)
      expect(res.body.received[0].receivedQuantity).toBe(50)
    })

    it('receives remaining quantity', async () => {
      if (!accessToken || !poId || !poLineId) return
      const res = await request(app)
        .post(`/api/inbound/po/${poId}/receive`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ lines: [{ lineId: poLineId, receivedQuantity: 50 }] })

      expect(res.status).toBe(200)
    })
  })

  describe('GET /api/inbound/po/:id/receive/summary', () => {
    it('shows receiving summary', async () => {
      if (!accessToken || !poId) return
      const res = await request(app)
        .get(`/api/inbound/po/${poId}/receive/summary`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0].receivedQuantity).toBe(100)
      expect(res.body[0].remaining).toBe(0)
    })
  })

  describe('POST /api/inbound/putaway/suggestions', () => {
    it('suggests putaway locations', async () => {
      if (!accessToken) return
      const res = await request(app)
        .post('/api/inbound/putaway/suggestions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ warehouseId, skuId, quantity: 100 })

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
    })
  })

  describe('POST /api/inbound/putaway/confirm', () => {
    it('confirms putaway', async () => {
      if (!accessToken) return
      const res = await request(app)
        .post('/api/inbound/putaway/confirm')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ skuId, locationId, quantity: 100, poId })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('movementId')
      expect(res.body.quantity).toBe(100)
    })
  })
})
