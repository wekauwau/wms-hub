import { Router } from 'express'
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  countCycleCountSchema,
  createCycleCountSchema,
  reconcileCycleCountSchema,
} from './cycle-count.schema.js'
import {
  cancelCycleCount,
  countCycleCount,
  createCycleCount,
  getCycleCount,
  listCycleCounts,
  reconcileCycleCount,
  startCycleCount,
} from './cycle-count.service.js'

const router = Router()

router.use(authenticate)

router.get('/', async (req, res, next) => {
  try {
    const warehouseId = req.query.warehouseId as string | undefined
    const counts = await listCycleCounts(warehouseId)
    res.json(counts)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const count = await getCycleCount(req.params.id as string)
    if (!count) {
      res.status(404).json({ error: 'Cycle count not found' })
      return
    }
    res.json(count)
  } catch (err) {
    next(err)
  }
})

router.post('/', validate(createCycleCountSchema), async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest
    const count = await createCycleCount(req.body, authReq.user.id)
    res.status(201).json(count)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/start', async (req, res, next) => {
  try {
    const status = await startCycleCount(req.params.id as string)
    res.json({ status })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/count', validate(countCycleCountSchema), async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest
    const count = await countCycleCount(req.params.id as string, req.body, authReq.user.id)
    res.json(count)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/reconcile', validate(reconcileCycleCountSchema), async (req, res, next) => {
  try {
    const authReq = req as unknown as AuthenticatedRequest
    const count = await reconcileCycleCount(req.params.id as string, req.body, authReq.user.id)
    res.json(count)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/cancel', async (req, res, next) => {
  try {
    await cancelCycleCount(req.params.id as string)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
