import { sql } from 'kysely'
import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import app from '../app.js'
import { getDb } from '../config/db.js'

describe('Supporting Workflows', () => {
  let accessToken = ''
  let warehouseId = 0
  let locationId = 0
  let skuId = 0
  let cycleCountId = 0
  let cycleCountLineId = 0
  let stockAdjustmentId = 0
  let stockTransferId = 0

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
      INSERT INTO warehouses (code, name) VALUES ('TEST-WH-WF', 'Test Warehouse Workflows')
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `.execute(db)
    warehouseId = wh.rows[0].id

    const loc = await sql<{ id: number }>`
      INSERT INTO locations (warehouse_id, code, name, type, path)
      VALUES (${warehouseId}, 'TEST-LOC-WF', 'Test Location WF', 'BIN', '1.0')
      ON CONFLICT (warehouse_id, code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `.execute(db)
    locationId = loc.rows[0].id

    const sku = await sql<{ id: number }>`
      INSERT INTO skus (sku_code, name, uom) VALUES ('TEST-SKU-WF', 'Test Widget WF', 'UNITS')
      ON CONFLICT (sku_code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `.execute(db)
    skuId = sku.rows[0].id
  })

  describe('POST /api/cycle-counts', () => {
    it('creates a cycle count', async () => {
      if (!accessToken) return
      const res = await request(app)
        .post('/api/cycle-counts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          warehouseId,
          lines: [{ skuId, locationId, expectedQuantity: 100 }],
        })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('id')
      expect(res.body.countNumber).toBeDefined()
      expect(res.body.status).toBe('DRAFT')
      cycleCountId = res.body.id
      cycleCountLineId = Number(res.body.lines[0].id)
    })
  })

  describe('GET /api/cycle-counts/:id', () => {
    it('returns the cycle count', async () => {
      if (!accessToken || !cycleCountId) return
      const res = await request(app)
        .get(`/api/cycle-counts/${cycleCountId}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.countNumber).toBeDefined()
      expect(res.body.lines).toBeDefined()
      expect(res.body.lines.length).toBe(1)
    })
  })

  describe('POST /api/cycle-counts/:id/count', () => {
    it('counts the cycle count lines', async () => {
      if (!accessToken || !cycleCountId || !cycleCountLineId) return
      const res = await request(app)
        .post(`/api/cycle-counts/${cycleCountId}/count`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ lines: [{ lineId: cycleCountLineId, countedQuantity: 95 }] })

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('SUBMITTED')
      expect(Number(res.body.lines[0].countedQuantity)).toBe(95)
    })
  })

  describe('POST /api/cycle-counts/:id/reconcile', () => {
    it('reconciles the cycle count', async () => {
      if (!accessToken || !cycleCountId || !cycleCountLineId) return
      const res = await request(app)
        .post(`/api/cycle-counts/${cycleCountId}/reconcile`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ lines: [{ lineId: cycleCountLineId, action: 'ADJUST' }] })

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('RECONCILED')
    })
  })

  describe('POST /api/stock-adjustments', () => {
    it('creates a stock adjustment', async () => {
      if (!accessToken) return
      const res = await request(app)
        .post('/api/stock-adjustments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          warehouseId,
          skuId,
          locationId,
          quantityChange: 25,
          reasonCode: 'DAMAGED',
          notes: 'Damaged goods removal',
        })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('id')
      expect(res.body.adjustmentNumber).toBeDefined()
      expect(res.body.status).toBe('PENDING')
      stockAdjustmentId = res.body.id
    })
  })

  describe('POST /api/stock-adjustments/:id/approve', () => {
    it('approves the stock adjustment', async () => {
      if (!accessToken || !stockAdjustmentId) return
      const res = await request(app)
        .post(`/api/stock-adjustments/${stockAdjustmentId}/approve`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ notes: 'Approved by admin' })

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('APPROVED')
      expect(res.body.approvedBy).toBeDefined()
    })
  })

  describe('POST /api/stock-transfers', () => {
    it('creates a stock transfer', async () => {
      if (!accessToken) return
      const res = await request(app)
        .post('/api/stock-transfers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          skuId,
          fromWarehouseId: warehouseId,
          fromLocationId: locationId,
          toWarehouseId: warehouseId,
          toLocationId: locationId,
          quantity: 50,
        })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('id')
      expect(res.body.transferNumber).toBeDefined()
      expect(res.body.status).toBe('PENDING')
      stockTransferId = res.body.id
    })
  })

  describe('POST /api/stock-transfers/:id/complete', () => {
    it('completes the stock transfer', async () => {
      if (!accessToken || !stockTransferId) return
      const res = await request(app)
        .post(`/api/stock-transfers/${stockTransferId}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('COMPLETED')
      expect(res.body.completedBy).toBeDefined()
    })
  })
})
