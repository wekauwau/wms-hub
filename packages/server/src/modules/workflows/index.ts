import { Router } from 'express'
import cycleCountRoutes from './cycle-count.routes.js'
import stockAdjustmentRoutes from './stock-adjustment.routes.js'
import stockTransferRoutes from './stock-transfer.routes.js'

const router = Router()

router.use('/cycle-counts', cycleCountRoutes)
router.use('/stock-adjustments', stockAdjustmentRoutes)
router.use('/stock-transfers', stockTransferRoutes)

export default router
