import { Router } from 'express'
import allocationRoutes from './allocation.routes.js'
import pickRoutes from './pick.routes.js'
import shipRoutes from './ship.routes.js'
import soRoutes from './so.routes.js'

const router = Router()

router.use('/so', soRoutes)
router.use('/so', allocationRoutes)
router.use('/so', pickRoutes)
router.use('/so', shipRoutes)

export default router
