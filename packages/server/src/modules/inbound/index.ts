import { Router } from 'express'
import poRoutes from './po.routes.js'
import putawayRoutes from './putaway.routes.js'

const router = Router()

router.use('/po', poRoutes)
router.use('/putaway', putawayRoutes)

export default router
