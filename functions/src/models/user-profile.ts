import {z} from "zod";

export const hiddenSuggestionsSchema = z.object({
  items: z.array(z.string()),
  categories: z.array(z.string()),
});

export const userProfileSchema = z.object({
  lastHistoryUpdate: z.number(),
  hiddenSuggestions: hiddenSuggestionsSchema,
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type HiddenSuggestions = z.infer<typeof hiddenSuggestionsSchema>;
