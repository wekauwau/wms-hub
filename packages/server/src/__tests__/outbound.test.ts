import { sql } from 'kysely'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import app from '../app.js'
import { getDb } from '../config/db.js'

describe('Outbound Pipeline', () => {
  let accessToken = ''
  let warehouseId = 0
  let binLocationId = 0
  let skuId = 0
  let soId = 0
  let soLineId = 0
  let pickId = 0

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
      INSERT INTO warehouses (code, name) VALUES ('TEST-WH-OUT', 'Test Warehouse Outbound')
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `.execute(db)
    warehouseId = wh.rows[0].id

    await sql`
      INSERT INTO locations (warehouse_id, code, name, type, path)
      VALUES (${warehouseId}, 'STAGING', 'Staging Area', 'BIN', '1.0')
      ON CONFLICT (warehouse_id, code) DO UPDATE SET name = EXCLUDED.name
    `.execute(db)

    const bin = await sql<{ id: number }>`
      INSERT INTO locations (warehouse_id, code, name, type, path)
      VALUES (${warehouseId}, 'OUT-BIN-01', 'Outbound Bin', 'BIN', '1.1')
      ON CONFLICT (warehouse_id, code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `.execute(db)
    binLocationId = bin.rows[0].id

    const sku = await sql<{ id: number }>`
      INSERT INTO skus (sku_code, name, uom) VALUES ('TEST-SKU-OUT', 'Test Outbound Widget', 'UNITS')
      ON CONFLICT (sku_code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `.execute(db)
    skuId = sku.rows[0].id

    await sql`
      INSERT INTO inventory_movements (sku_id, location_id, warehouse_id, quantity, movement_type, reference_type, created_by)
      VALUES (${skuId}, ${binLocationId}, ${warehouseId}, 200, 'RECEIPT', 'SEED', 1)
    `.execute(db)
  })

  describe('POST /api/outbound/so', () => {
    it('creates a sales order', async () => {
      if (!accessToken) return
      const res = await request(app)
        .post('/api/outbound/so')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          orderNumber: `TEST-SO-${Date.now()}`,
          warehouseId,
          customerName: 'Test Customer',
          customerAddress: '123 Test St',
          priority: 1,
        })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('id')
      soId = res.body.id
    })
  })

  describe('POST /api/outbound/so/:id/lines', () => {
    it('adds a line to the SO', async () => {
      if (!accessToken || !soId) return
      const res = await request(app)
        .post(`/api/outbound/so/${soId}/lines`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ skuId, requestedQuantity: 50 })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('id')
      soLineId = Number(res.body.id)
    })
  })

  describe('GET /api/outbound/so/:id', () => {
    it('returns the SO with lines', async () => {
      if (!accessToken || !soId) return
      const res = await request(app)
        .get(`/api/outbound/so/${soId}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.orderNumber).toBeDefined()
      expect(res.body.lines).toBeDefined()
      expect(res.body.lines.length).toBe(1)
    })
  })

  describe('POST /api/outbound/so/:id/allocate', () => {
    it('allocates stock for the SO line', async () => {
      if (!accessToken || !soId || !soLineId) return
      const res = await request(app)
        .post(`/api/outbound/so/${soId}/allocate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ lines: [{ lineId: soLineId, quantity: 50 }] })

      expect(res.status).toBe(200)
      expect(res.body.allocated).toHaveLength(1)
      expect(res.body.allocated[0].allocatedQuantity).toBe(50)
    })
  })

  describe('GET /api/outbound/so/:id/allocations', () => {
    it('returns allocations for the SO', async () => {
      if (!accessToken || !soId) return
      const res = await request(app)
        .get(`/api/outbound/so/${soId}/allocations`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
    })
  })

  describe('POST /api/outbound/so/:id/picks', () => {
    it('creates pick tasks', async () => {
      if (!accessToken || !soId || !soLineId) return
      const res = await request(app)
        .post(`/api/outbound/so/${soId}/picks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          picks: [{ soLineId, locationId: binLocationId, expectedQuantity: 50 }],
        })

      expect(res.status).toBe(201)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBe(1)
      pickId = Number(res.body[0].id)
    })
  })

  describe('POST /api/outbound/so/:id/picks/:pickId/complete', () => {
    it('completes a pick task', async () => {
      if (!accessToken || !soId || !pickId) return
      const res = await request(app)
        .post(`/api/outbound/so/${soId}/picks/${pickId}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ pickedQuantity: 50 })

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('COMPLETED')
      expect(Number(res.body.pickedQuantity)).toBe(50)
    })
  })

  describe('POST /api/outbound/so/:id/ship', () => {
    it('ships the order', async () => {
      if (!accessToken || !soId || !soLineId) return
      const res = await request(app)
        .post(`/api/outbound/so/${soId}/ship`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          carrier: 'Test Carrier',
          trackingNumber: 'TRACK-123',
          items: [{ soLineId, quantity: 50 }],
        })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('id')
      expect(res.body.shipmentNumber).toBeDefined()
      expect(res.body.carrier).toBe('Test Carrier')
      expect(res.body.items).toHaveLength(1)
    })
  })

  describe('GET /api/outbound/so/:id/shipment', () => {
    it('returns the shipment', async () => {
      if (!accessToken || !soId) return
      const res = await request(app)
        .get(`/api/outbound/so/${soId}/shipment`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.shipmentNumber).toBeDefined()
      expect(res.body.items).toHaveLength(1)
    })
  })
})
