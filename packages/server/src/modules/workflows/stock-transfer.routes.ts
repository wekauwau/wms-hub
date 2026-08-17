import { Router } from 'express'
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { createStockTransferSchema } from './stock-transfer.schema.js'
import {
  cancelStockTransfer,
  completeStockTransfer,
  createStockTransfer,
  getStockTransfer,
  listStockTransfers,
} from './stock-transfer.service.js'

const router = Router()

router.use(authenticate)

router.get('/', async (req, res, next) => {
  try {
    const warehouseId = req.query.warehouseId as string | undefined
    const transfers = await listStockTransfers(warehouseId)
    res.json(transfers)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const transfer = await getStockTransfer(req.params.id as string)
    if (!transfer) {
      res.status(404).json({ error: 'Stock transfer not found' })
      return
    }
    res.json(transfer)
  } catch (err) {
    next(err)
  }
})

router.post('/', validate(createStockTransferSchema), async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest
    const transfer = await createStockTransfer(req.body, authReq.user.id)
    res.status(201).json(transfer)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/complete', async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest
    const transfer = await completeStockTransfer(req.params.id as string, authReq.user.id)
    res.json(transfer)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/cancel', async (req, res, next) => {
  try {
    await cancelStockTransfer(req.params.id as string)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
