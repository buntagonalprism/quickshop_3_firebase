import {z} from "zod";

export const shoppingItemHistorySchema = z.object({
  name: z.string(),
  nameLower: z.string(),
  category: z.string(),
  lastUsed: z.number(),
  usageCount: z.number(),
});

export type ShoppingItemHistory = z.infer<typeof shoppingItemHistorySchema>;
