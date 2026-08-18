import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

function findEnvFile(): string {
  let dir = process.cwd()
  while (dir !== path.dirname(dir)) {
    const envPath = path.join(dir, '.env')
    if (fs.existsSync(envPath)) return envPath
    dir = path.dirname(dir)
  }
  return path.join(process.cwd(), '.env')
}

dotenv.config({ path: findEnvFile() })

const API_URL = process.env.DEMO_API_URL ?? 'http://localhost:3000/api'

async function api<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { error?: unknown }
    throw new Error(`${method} ${endpoint}: ${String(error.error ?? response.status)}`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function log(step: string, message: string) {
  console.log(`  ${step}: ${message}`)
}

async function run() {
  console.log('WMS Hub Demo\n')

  console.log('1. Login as operator')
  const login = await api<{ accessToken: string; user: { id: string; email: string } }>(
    'POST',
    '/auth/login',
    {
      email: 'operator@wms.local',
      password: 'operator123',
    },
  )
  const token = login.accessToken
  log('login', `authenticated as ${login.user.email}`)

  console.log('\n2. Warehouse lookup')
  const kpi = await api<{ warehouseId: string; warehouseCode: string }[]>(
    'GET',
    '/reports/kpi',
    undefined,
    token,
  )
  const warehouseId = kpi[0] ? Number(kpi[0].warehouseId) : 0
  log('warehouse', `using warehouse ${kpi[0]?.warehouseCode ?? '?'} (id=${warehouseId})`)

  console.log('\n3. Create purchase order')
  const po = await api<{ id: string; poNumber: string }>(
    'POST',
    '/inbound/po',
    {
      poNumber: `DEMO-PO-${Date.now()}`,
      warehouseId,
      supplierName: 'Demo Supply Co.',
    },
    token,
  )
  log('po', `created ${po.poNumber}`)

  console.log('\n4. Add PO line')
  const skuId = 1
  const poLine = await api<{ id: string; expectedQuantity: number }>(
    'POST',
    `/inbound/po/${po.id}/lines`,
    {
      skuId,
      expectedQuantity: 10,
    },
    token,
  )
  log('po-line', `line ${poLine.id} expects ${poLine.expectedQuantity}`)

  console.log('\n5. Receive PO')
  const received = await api<{ received: { lineId: string; receivedQuantity: number }[] }>(
    'POST',
    `/inbound/po/${po.id}/receive`,
    {
      lines: [{ lineId: Number(poLine.id), receivedQuantity: 10 }],
    },
    token,
  )
  log(
    'receive',
    `received ${received.received[0]?.receivedQuantity} on line ${received.received[0]?.lineId}`,
  )

  console.log('\n6. Suggest putaway')
  const suggestions = await api<{ locationId: string; locationCode: string }[]>(
    'POST',
    '/inbound/putaway/suggestions',
    {
      warehouseId,
      skuId,
      quantity: 10,
    },
    token,
  )
  const locationId = suggestions[0]?.locationId ? Number(suggestions[0].locationId) : 0
  log(
    'putaway-suggest',
    `suggested ${suggestions.length} locations, using ${suggestions[0]?.locationCode}`,
  )

  console.log('\n7. Confirm putaway')
  const putaway = await api<{ movementId: string }>(
    'POST',
    '/inbound/putaway/confirm',
    {
      skuId,
      locationId,
      quantity: 10,
      poId: Number(po.id),
    },
    token,
  )
  log('putaway', `movement ${putaway.movementId}`)

  console.log('\n8. Create sales order')
  const so = await api<{ id: string; orderNumber: string }>(
    'POST',
    '/outbound/so',
    {
      orderNumber: `DEMO-SO-${Date.now()}`,
      warehouseId,
      customerName: 'Demo Customer',
      customerAddress: '456 Demo Ave',
      priority: 1,
    },
    token,
  )
  log('so', `created ${so.orderNumber}`)

  console.log('\n9. Add SO line')
  const soLine = await api<{ id: string }>(
    'POST',
    `/outbound/so/${so.id}/lines`,
    {
      skuId,
      requestedQuantity: 5,
    },
    token,
  )
  log('so-line', `line ${soLine.id}`)

  console.log('\n10. Allocate')
  await api(
    'POST',
    `/outbound/so/${so.id}/allocate`,
    {
      lines: [{ lineId: Number(soLine.id), quantity: 5 }],
    },
    token,
  )
  log('allocate', 'stock allocated')

  console.log('\n11. Create pick')
  const picks = await api<{ id: string; expectedQuantity: number }[]>(
    'POST',
    `/outbound/so/${so.id}/picks`,
    {
      picks: [{ soLineId: Number(soLine.id), locationId, expectedQuantity: 5 }],
    },
    token,
  )
  const pickId = picks[0]?.id
  log('pick', `created pick ${pickId}`)

  console.log('\n12. Complete pick')
  await api('POST', `/outbound/so/${so.id}/picks/${pickId}/complete`, { pickedQuantity: 5 }, token)
  log('pick-complete', `completed pick ${pickId}`)

  console.log('\n13. Ship')
  const shipment = await api<{ id: string; shipmentNumber: string }>(
    'POST',
    `/outbound/so/${so.id}/ship`,
    {
      carrier: 'Demo Carrier',
      trackingNumber: `DEMO-TRK-${Date.now()}`,
      items: [{ soLineId: Number(soLine.id), quantity: 5 }],
    },
    token,
  )
  log('ship', `shipment ${shipment.shipmentNumber}`)

  console.log('\nDemo complete.')
}

run().catch((err) => {
  console.error('\nDemo failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
