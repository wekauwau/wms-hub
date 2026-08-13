import { z } from 'zod'

export const suggestPutawaySchema = z.object({
  warehouseId: z.number().int().positive(),
  skuId: z.number().int().positive(),
  quantity: z.number().positive(),
})

export const confirmPutawaySchema = z.object({
  skuId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  quantity: z.number().positive(),
  poId: z.number().int().positive().optional(),
  notes: z.string().optional(),
})

export type SuggestPutawayInput = z.infer<typeof suggestPutawaySchema>
export type ConfirmPutawayInput = z.infer<typeof confirmPutawaySchema>
