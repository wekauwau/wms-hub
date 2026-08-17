import { Router } from 'express'
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  allocateSingleLine,
  allocateSo,
  getAllocations,
  releaseAllocation,
} from './allocation.service.js'
import { allocateLineSchema, allocateSoSchema } from './so.schema.js'
import { getSo } from './so.service.js'

const router = Router({ mergeParams: true })

router.use(authenticate)

router.get('/:id/allocations', async (req, res, next) => {
  try {
    const so = await getSo(req.params.id as string)
    if (!so) {
      res.status(404).json({ error: 'Sales order not found' })
      return
    }
    const allocations = await getAllocations(req.params.id as string)
    res.json(allocations)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/allocate', validate(allocateSoSchema), async (req, res, next) => {
  try {
    const so = await getSo(req.params.id as string)
    if (!so) {
      res.status(404).json({ error: 'Sales order not found' })
      return
    }
    const authReq = req as AuthenticatedRequest
    const result = await allocateSo(req.params.id as string, req.body, authReq.user.id)
    res.json({ allocated: result })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/allocate/:lineId', validate(allocateLineSchema), async (req, res, next) => {
  try {
    const so = await getSo(req.params.id as string)
    if (!so) {
      res.status(404).json({ error: 'Sales order not found' })
      return
    }
    const authReq = req as AuthenticatedRequest
    const result = await allocateSingleLine(
      req.params.id as string,
      req.params.lineId as string,
      req.body.quantity,
      authReq.user.id,
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id/allocate/:lineId', async (req, res, next) => {
  try {
    const so = await getSo(req.params.id as string)
    if (!so) {
      res.status(404).json({ error: 'Sales order not found' })
      return
    }
    const released = await releaseAllocation(req.params.id as string, req.params.lineId as string)
    if (!released) {
      res.status(404).json({ error: 'No active allocation found' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
