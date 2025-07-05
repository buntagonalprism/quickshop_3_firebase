import {z} from "zod";

export const shoppingItemSchema = z.object({
  product: z.string(),
  quantity: z.string(),
  categories: z.array(z.string()),
  lastModifiedByUserId: z.string(),
  lastModifiedAt: z.number(),
  completed: z.boolean(),
});

export type ShoppingItem = z.infer<typeof shoppingItemSchema>;
