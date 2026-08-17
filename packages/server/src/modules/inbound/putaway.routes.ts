import { Router } from 'express'
import { authenticate, AuthenticatedRequest } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { confirmPutawaySchema, suggestPutawaySchema } from './putaway.schema.js'
import { confirmPutaway, suggestPutawayLocations } from './putaway.service.js'

const router = Router()

router.use(authenticate)

router.post('/suggestions', validate(suggestPutawaySchema), async (req, res, next) => {
  try {
    const { warehouseId, skuId, quantity } = req.body
    const suggestions = await suggestPutawayLocations(String(warehouseId), String(skuId), quantity)
    res.json(suggestions)
  } catch (err) {
    next(err)
  }
})

router.post('/confirm', validate(confirmPutawaySchema), async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest
    const result = await confirmPutaway(req.body, authReq.user.id)
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

export default router
