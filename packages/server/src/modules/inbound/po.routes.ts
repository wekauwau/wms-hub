import { Router } from 'express'
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import {
  addPoLineSchema,
  createPoSchema,
  receiveLineSchema,
  receivePoSchema,
  updatePoSchema,
} from './po.schema.js'
import {
  addPoLine,
  createPo,
  deletePo,
  deletePoLine,
  getPo,
  listPo,
  updatePo,
} from './po.service.js'
import { getReceivingSummary, receivePo, receiveSingleLine } from './receiving.service.js'

const router = Router()

router.use(authenticate)

router.get('/', async (_req, res, next) => {
  try {
    const pos = await listPo()
    res.json(pos)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const po = await getPo(req.params.id as string)
    if (!po) {
      res.status(404).json({ error: 'Purchase order not found' })
      return
    }
    res.json(po)
  } catch (err) {
    next(err)
  }
})

router.post('/', validate(createPoSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const po = await createPo(req.body, authReq.user.id)
    res.status(201).json(po)
  } catch (err) {
    next(err)
  }
})

router.put('/:id', validate(updatePoSchema), async (req, res, next) => {
  try {
    const po = await updatePo(req.params.id as string, req.body)
    if (!po) {
      res.status(404).json({ error: 'Purchase order not found' })
      return
    }
    res.json(po)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await deletePo(req.params.id as string)
    if (!deleted) {
      res.status(404).json({ error: 'Purchase order not found' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.post('/:id/lines', validate(addPoLineSchema), async (req, res, next) => {
  try {
    const po = await getPo(req.params.id as string)
    if (!po) {
      res.status(404).json({ error: 'Purchase order not found' })
      return
    }
    const line = await addPoLine(req.params.id as string, req.body)
    res.status(201).json(line)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id/lines/:lineId', async (req, res, next) => {
  try {
    const deleted = await deletePoLine(req.params.id as string, req.params.lineId as string)
    if (!deleted) {
      res.status(404).json({ error: 'PO line not found' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.get('/:id/receive/summary', async (req, res, next) => {
  try {
    const summary = await getReceivingSummary(req.params.id as string)
    res.json(summary)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/receive', validate(receivePoSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const result = await receivePo(req.params.id as string, req.body, authReq.user.id)
    res.json({ received: result })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/receive/:lineId', validate(receiveLineSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const result = await receiveSingleLine(
      req.params.id as string,
      req.params.lineId as string,
      req.body.receivedQuantity,
      authReq.user.id,
    )
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
