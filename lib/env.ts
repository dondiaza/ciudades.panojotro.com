import { z } from "zod";

const nonEmptyString = (name: string) =>
  z.string().trim().min(1, `${name} es obligatorio.`);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  TRELLO_KEY: nonEmptyString("TRELLO_KEY").optional(),
  TRELLO_API_KEY: nonEmptyString("TRELLO_API_KEY").optional(),
  TRELLO_TOKEN: nonEmptyString("TRELLO_TOKEN"),
  TRELLO_BOARD_ID: nonEmptyString("TRELLO_BOARD_ID"),
  AUTH_USER: nonEmptyString("AUTH_USER"),
  AUTH_PASS: nonEmptyString("AUTH_PASS"),
  AUTH_SECRET: z
    .string()
    .trim()
    .min(32, "AUTH_SECRET debe tener al menos 32 caracteres."),
  CITY_MODE: z.enum(["auto", "list", "customField", "label"]).default("auto"),
  CITY_FIELD_NAME: nonEmptyString("CITY_FIELD_NAME").default("Ciudad"),
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
