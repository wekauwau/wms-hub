import { z } from 'zod'

export const createPoSchema = z.object({
  poNumber: z.string().min(1).max(50),
  warehouseId: z.number().int().positive(),
  supplierName: z.string().max(255).optional(),
  expectedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional(),
  notes: z.string().optional(),
})

export const updatePoSchema = z.object({
  poNumber: z.string().min(1).max(50).optional(),
  warehouseId: z.number().int().positive().optional(),
  supplierName: z.string().max(255).optional(),
  expectedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional(),
  status: z
    .enum(['DRAFT', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED'])
    .optional(),
  notes: z.string().optional(),
})

export const addPoLineSchema = z.object({
  skuId: z.number().int().positive(),
  expectedQuantity: z.number().positive(),
  unitCost: z.number().positive().optional(),
})

export const receiveLineSchema = z.object({
  receivedQuantity: z.number().positive(),
})

export const receivePoSchema = z.object({
  lines: z
    .array(
      z.object({
        lineId: z.number().int().positive(),
        receivedQuantity: z.number().positive(),
      }),
    )
    .min(1),
})

export type CreatePoInput = z.infer<typeof createPoSchema>
export type UpdatePoInput = z.infer<typeof updatePoSchema>
export type AddPoLineInput = z.infer<typeof addPoLineSchema>
export type ReceiveLineInput = z.infer<typeof receiveLineSchema>
export type ReceivePoInput = z.infer<typeof receivePoSchema>
