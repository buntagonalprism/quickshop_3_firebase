import {z} from "zod";

export const userProfileSchema = z.object({
  lastHistoryUpdate: z.number(),
  lastSuggestionsHidden: z.number(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
