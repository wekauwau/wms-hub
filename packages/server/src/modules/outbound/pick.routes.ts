import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { validate } from '../../middleware/validate.js'
import { completePick, getPicks } from './pick.service.js'
import { completePickSchema } from './so.schema.js'
import { getSo } from './so.service.js'

const router = Router({ mergeParams: true })

router.use(authenticate)

router.get('/:id/picks', async (req, res, next) => {
  try {
    const so = await getSo(req.params.id as string)
    if (!so) {
      res.status(404).json({ error: 'Sales order not found' })
      return
    }
    const picks = await getPicks(req.params.id as string)
    res.json(picks)
  } catch (err) {
    next(err)
  }
})

router.post('/:id/picks/:pickId/complete', validate(completePickSchema), async (req, res, next) => {
  try {
    const so = await getSo(req.params.id as string)
    if (!so) {
      res.status(404).json({ error: 'Sales order not found' })
      return
    }
    const result = await completePick(req.params.pickId as string, req.body.pickedQuantity)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
