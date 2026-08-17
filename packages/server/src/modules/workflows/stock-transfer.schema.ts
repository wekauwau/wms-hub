import { z } from 'zod'

export const createStockTransferSchema = z.object({
  skuId: z.number().int().positive(),
  fromWarehouseId: z.number().int().positive(),
  fromLocationId: z.number().int().positive(),
  toWarehouseId: z.number().int().positive(),
  toLocationId: z.number().int().positive(),
  quantity: z.number().positive(),
})

export const completeStockTransferSchema = z.object({})

export const cancelStockTransferSchema = z.object({})

export type CreateStockTransferInput = z.infer<typeof createStockTransferSchema>
export type CompleteStockTransferInput = z.infer<typeof completeStockTransferSchema>
export type CancelStockTransferInput = z.infer<typeof cancelStockTransferSchema>
