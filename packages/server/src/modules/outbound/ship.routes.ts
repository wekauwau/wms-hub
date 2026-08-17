import { Router } from 'express'
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { getShipment, shipSo } from './ship.service.js'
import { shipSoSchema } from './so.schema.js'
import { getSo } from './so.service.js'

const router = Router({ mergeParams: true })

router.use(authenticate)

router.get('/:id/shipment', async (req, res, next) => {
  try {
    const so = await getSo(req.params.id as string)
    if (!so) {
      res.status(404).json({ error: 'Sales order not found' })
      return
    }
    const shipment = await getShipment(req.params.id as string)
    if (!shipment) {
      res.status(404).json({ error: 'No shipment found' })
      return
    }
    res.json(shipment)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/ship', validate(shipSoSchema), async (req, res, next) => {
  try {
    const so = await getSo(req.params.id as string)
    if (!so) {
      res.status(404).json({ error: 'Sales order not found' })
      return
    }
    const authReq = req as AuthenticatedRequest
    const result = await shipSo(req.params.id as string, req.body, authReq.user.id)
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

export default router
