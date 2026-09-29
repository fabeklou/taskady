import { z } from "zod";

export const usernameRule = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username may only contain letters, numbers, _ and -"
  );

export const signupSchema = z.object({
  username: usernameRule,
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

export const loginSchema = signupSchema;

export const CATEGORY_OPTIONS = ["General", "Personal", "Professional"] as const;
export const categorySchema = z.enum(CATEGORY_OPTIONS);

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  note: z.string().trim().max(1000).optional().default(""),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().default("MEDIUM"),
  category: categorySchema.optional().default("General"),
  dueAt: z
    .string()
    .trim()
    .max(40)
    .nullable()
    .optional()
    .transform((v) => {
      if (!v) return null;
      const ms = Date.parse(v);
      return Number.isNaN(ms) ? null : new Date(ms).toISOString();
    })
    .refine((v) => v === null || !Number.isNaN(Date.parse(v)), {
      message: "Invalid due date",
    }),
  remindBefore: z.enum(["NONE", "DAY", "3H", "1H"]).optional().default("NONE"),
});

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  note: z.string().trim().max(1000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  category: categorySchema.optional(),
  status: z.enum(["OPEN", "DONE"]).optional(),
  incrementPomodoro: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
  dueAt: z
    .string()
    .trim()
    .max(40)
    .nullable()
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (!v) return null;
      const ms = Date.parse(v);
      return Number.isNaN(ms) ? v : new Date(ms).toISOString();
    })
    .refine((v) => v === undefined || v === null || !Number.isNaN(Date.parse(v)), {
      message: "Invalid due date",
    }),
  remindBefore: z.enum(["NONE", "DAY", "3H", "1H"]).optional(),
});

export const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1).max(500),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
