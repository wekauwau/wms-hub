import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { getDashboardKpi, getLocationUsage, getStockSummary } from './reports.service.js'

const router = Router()

router.use(authenticate)

router.get('/kpi', async (req, res, next) => {
  try {
    const warehouseId = req.query.warehouseId as string | undefined
    const kpi = await getDashboardKpi(warehouseId)
    res.json(kpi)
  } catch (err) {
    next(err)
  }
})

router.get('/location-usage', async (_req, res, next) => {
  try {
    const usage = await getLocationUsage()
    res.json(usage)
  } catch (err) {
    next(err)
  }
})

router.get('/stock-summary', async (req, res, next) => {
  try {
    const warehouseId = req.query.warehouseId as string | undefined
    const summary = await getStockSummary(warehouseId)
    res.json(summary)
  } catch (err) {
    next(err)
  }
})

export default router
