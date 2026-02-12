import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  TRELLO_KEY: z.string().min(1).optional(),
  TRELLO_API_KEY: z.string().min(1).optional(),
  TRELLO_TOKEN: z.string().min(1, "TRELLO_TOKEN es obligatorio."),
  TRELLO_BOARD_ID: z.string().min(1, "TRELLO_BOARD_ID es obligatorio."),
  AUTH_USER: z.string().min(1, "AUTH_USER es obligatorio."),
  AUTH_PASS: z.string().min(1, "AUTH_PASS es obligatorio."),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET debe tener al menos 32 caracteres."),
  CITY_MODE: z.enum(["auto", "list", "customField", "label"]).default("auto"),
  CITY_FIELD_NAME: z.string().min(1).default("Ciudad"),
  UPCOMING_DAYS: z.coerce.number().int().positive().max(60).default(7),
  TRELLO_REVALIDATE_SECONDS: z.coerce
    .number()
    .int()
    .min(15)
    .max(3600)
    .default(60),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Variables de entorno inválidas:\n${details}`);
}

const trelloKey = parsedEnv.data.TRELLO_KEY ?? parsedEnv.data.TRELLO_API_KEY;

if (!trelloKey) {
  throw new Error(
    "Variables de entorno inválidas:\nTRELLO_KEY o TRELLO_API_KEY es obligatorio.",
  );
}

export const env = {
  ...parsedEnv.data,
  TRELLO_KEY: trelloKey,
};
