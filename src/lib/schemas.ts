import { z } from 'zod'

const CategoryEnum = z.enum(['jewelry', 'top', 'bottom', 'dress', 'outerwear', 'shoes', 'bag', 'other'])
const ImageSourceEnum = z.enum(['scraped_url', 'uploaded_file', 'manual_url', 'none'])

export const CreateItemSchema = z.object({
  product_url: z.string(),
  product_name: z.string().min(1),
  brand: z.string().nullable().optional(),
  retailer: z.string().nullable().optional(),
  price: z.string().nullable().optional(),
  category: CategoryEnum,
  color: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  image_source: ImageSourceEnum,
})

export type CreateItemInput = z.infer<typeof CreateItemSchema>

export const UpdateItemSchema = CreateItemSchema.partial()

export type UpdateItemInput = z.infer<typeof UpdateItemSchema>

const SlotInputSchema = z.object({
  slot_type: CategoryEnum,
  wishlist_item_id: z.string().uuid().nullable(),
  display_order: z.number().int().nonnegative().optional().default(0),
})

export const CreateOutfitSchema = z.object({
  name: z.string().min(1),
  notes: z.string().nullable().optional(),
  slots: z.array(SlotInputSchema).optional().default([]),
})

export type CreateOutfitInput = z.infer<typeof CreateOutfitSchema>

export const UpdateOutfitSchema = CreateOutfitSchema

export type UpdateOutfitInput = z.infer<typeof UpdateOutfitSchema>

export const ScrapeSchema = z.object({
  url: z.string().min(1),
})

export type ScrapeInput = z.infer<typeof ScrapeSchema>

export const UuidParamSchema = z.object({
  id: z.string().uuid(),
})

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

export const UploadFileSchema = z.object({
  file: z
    .custom<File>((v) => v instanceof File, { message: 'No file provided' })
    .refine((f) => ALLOWED_MIME_TYPES.includes((f as File).type), {
      message: 'Unsupported file type. Use JPEG, PNG, WebP, or GIF.',
    })
    .refine((f) => (f as File).size <= MAX_UPLOAD_SIZE, {
      message: 'File too large. Maximum size is 5MB.',
    }),
})

export type UploadFileInput = z.infer<typeof UploadFileSchema>
