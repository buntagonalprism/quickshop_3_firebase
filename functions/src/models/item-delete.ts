import {z} from "zod";
import {shoppingItemSchema} from "./shopping-item";

export const itemDeleteSchema = z.object({
  timestamp: z.number(),
  userId: z.string(),
  deletedCount: z.number(),
  items: z.array(shoppingItemSchema),
});

export type ItemDelete = z.infer<typeof itemDeleteSchema>;
