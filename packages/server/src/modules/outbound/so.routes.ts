import { Router } from 'express'
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { addSoLineSchema, createSoSchema, updateSoSchema } from './so.schema.js'
import {
  addSoLine,
  createSo,
  deleteSo,
  deleteSoLine,
  getSo,
  listSo,
  updateSo,
} from './so.service.js'

const router = Router()

router.use(authenticate)

router.get('/', async (_req, res, next) => {
  try {
    const sos = await listSo()
    res.json(sos)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const so = await getSo(req.params.id as string)
    if (!so) {
      res.status(404).json({ error: 'Sales order not found' })
      return
    }
    res.json(so)
  } catch (err) {
    next(err)
  }
})

router.post('/', validate(createSoSchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const so = await createSo(req.body, authReq.user.id)
    res.status(201).json(so)
  } catch (err) {
    next(err)
  }
})

router.put('/:id', validate(updateSoSchema), async (req, res, next) => {
  try {
    const so = await updateSo(req.params.id as string, req.body)
    if (!so) {
      res.status(404).json({ error: 'Sales order not found' })
      return
    }
    res.json(so)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await deleteSo(req.params.id as string)
    if (!deleted) {
      res.status(404).json({ error: 'Sales order not found' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.post('/:id/lines', validate(addSoLineSchema), async (req, res, next) => {
  try {
    const so = await getSo(req.params.id as string)
    if (!so) {
      res.status(404).json({ error: 'Sales order not found' })
      return
    }
    const line = await addSoLine(req.params.id as string, req.body)
    res.status(201).json(line)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id/lines/:lineId', async (req, res, next) => {
  try {
    const deleted = await deleteSoLine(req.params.id as string, req.params.lineId as string)
    if (!deleted) {
      res.status(404).json({ error: 'SO line not found' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
