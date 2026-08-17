import { z } from 'zod'

export const createSoSchema = z.object({
  orderNumber: z.string().min(1).max(50),
  warehouseId: z.number().int().positive(),
  customerName: z.string().max(255).optional(),
  customerAddress: z.string().optional(),
  priority: z.number().int().min(0).max(10).optional(),
  notes: z.string().optional(),
})

export const updateSoSchema = z.object({
  orderNumber: z.string().min(1).max(50).optional(),
  warehouseId: z.number().int().positive().optional(),
  customerName: z.string().max(255).optional(),
  customerAddress: z.string().optional(),
  status: z
    .enum([
      'PENDING',
      'ALLOCATED',
      'PICKING',
      'PICKED',
      'PACKED',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
    ])
    .optional(),
  priority: z.number().int().min(0).max(10).optional(),
  notes: z.string().optional(),
})

export const addSoLineSchema = z.object({
  skuId: z.number().int().positive(),
  requestedQuantity: z.number().positive(),
})

export const allocateSoSchema = z.object({
  lines: z
    .array(
      z.object({
        lineId: z.number().int().positive(),
        quantity: z.number().positive(),
      }),
    )
    .min(1),
})

export const allocateLineSchema = z.object({
  quantity: z.number().positive(),
})

export const completePickSchema = z.object({
  pickedQuantity: z.number().positive(),
})

export const shipSoSchema = z.object({
  carrier: z.string().max(100).optional(),
  trackingNumber: z.string().max(255).optional(),
  items: z
    .array(
      z.object({
        soLineId: z.number().int().positive(),
        quantity: z.number().positive(),
      }),
    )
    .min(1),
})

export type CreateSoInput = z.infer<typeof createSoSchema>
export type UpdateSoInput = z.infer<typeof updateSoSchema>
export type AddSoLineInput = z.infer<typeof addSoLineSchema>
export type AllocateSoInput = z.infer<typeof allocateSoSchema>
export type AllocateLineInput = z.infer<typeof allocateLineSchema>
export type CompletePickInput = z.infer<typeof completePickSchema>
export type ShipSoInput = z.infer<typeof shipSoSchema>
