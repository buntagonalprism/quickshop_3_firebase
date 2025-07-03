import {Timestamp} from "firebase-admin/firestore";
import {z} from "zod";

export const shoppingCategoryHistorySchema = z.object({
  name: z.string(),
  nameLower: z.string(),
  lastUsed: z.instanceof(Timestamp),
  usageCount: z.number(),
});

export type ShoppingCategoryHistory = z.infer<typeof shoppingCategoryHistorySchema>;
