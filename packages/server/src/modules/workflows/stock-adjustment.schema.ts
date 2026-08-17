import { z } from 'zod'

export const createStockAdjustmentSchema = z.object({
  warehouseId: z.number().int().positive(),
  skuId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  quantityChange: z.number(),
  reasonCode: z.string().min(1).max(50),
  notes: z.string().optional(),
})

export const approveStockAdjustmentSchema = z.object({
  notes: z.string().optional(),
})

export const rejectStockAdjustmentSchema = z.object({
  notes: z.string().optional(),
})

export type CreateStockAdjustmentInput = z.infer<typeof createStockAdjustmentSchema>
export type ApproveStockAdjustmentInput = z.infer<typeof approveStockAdjustmentSchema>
export type RejectStockAdjustmentInput = z.infer<typeof rejectStockAdjustmentSchema>
