import {z} from "zod";

export const shoppingCategoryHistorySchema = z.object({
  name: z.string(),
  nameLower: z.string(),
  lastUsed: z.number(),
  usageCount: z.number(),
});

export type ShoppingCategoryHistory = z.infer<typeof shoppingCategoryHistorySchema>;
