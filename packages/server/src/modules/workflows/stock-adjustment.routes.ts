import { Router } from 'express'
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  approveStockAdjustmentSchema,
  createStockAdjustmentSchema,
  rejectStockAdjustmentSchema,
} from './stock-adjustment.schema.js'
import {
  approveStockAdjustment,
  createStockAdjustment,
  getStockAdjustment,
  listStockAdjustments,
  rejectStockAdjustment,
} from './stock-adjustment.service.js'

const router = Router()

router.use(authenticate)

router.get('/', async (req, res, next) => {
  try {
    const warehouseId = req.query.warehouseId as string | undefined
    const adjustments = await listStockAdjustments(warehouseId)
    res.json(adjustments)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const adjustment = await getStockAdjustment(req.params.id as string)
    if (!adjustment) {
      res.status(404).json({ error: 'Stock adjustment not found' })
      return
    }
    res.json(adjustment)
  } catch (err) {
    next(err)
  }
})

router.post('/', validate(createStockAdjustmentSchema), async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest
    const adjustment = await createStockAdjustment(req.body, authReq.user.id)
    res.status(201).json(adjustment)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/approve', validate(approveStockAdjustmentSchema), async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest
    const adjustment = await approveStockAdjustment(
      req.params.id as string,
      authReq.user.id,
      req.body.notes,
    )
    res.json(adjustment)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/reject', validate(rejectStockAdjustmentSchema), async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest
    const adjustment = await rejectStockAdjustment(
      req.params.id as string,
      authReq.user.id,
      req.body.notes,
    )
    res.json(adjustment)
  } catch (err) {
    next(err)
  }
})

export default router
