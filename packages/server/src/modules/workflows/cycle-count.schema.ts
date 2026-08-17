import { z } from 'zod'

export const createCycleCountSchema = z.object({
  warehouseId: z.number().int().positive(),
  locationId: z.number().int().positive().optional(),
  lines: z
    .array(
      z.object({
        skuId: z.number().int().positive(),
        locationId: z.number().int().positive(),
        expectedQuantity: z.number().min(0),
      }),
    )
    .min(1),
})

export const countLineSchema = z.object({
  countedQuantity: z.number().min(0),
})

export const countCycleCountSchema = z.object({
  lines: z
    .array(
      z.object({
        lineId: z.number().int().positive(),
        countedQuantity: z.number().min(0),
      }),
    )
    .min(1),
})

export const reconcileCycleCountSchema = z.object({
  lines: z
    .array(
      z.object({
        lineId: z.number().int().positive(),
        action: z.enum(['ADJUST', 'IGNORE']),
      }),
    )
    .min(1),
})

export type CreateCycleCountInput = z.infer<typeof createCycleCountSchema>
export type CountLineInput = z.infer<typeof countLineSchema>
export type CountCycleCountInput = z.infer<typeof countCycleCountSchema>
export type ReconcileCycleCountInput = z.infer<typeof reconcileCycleCountSchema>
