import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  functions: {
    mail: {
      name: "lightcms",
      source: "./functions/mail.ts",
      env: {
        SMTP_MAIL: process.env.SMTP_MAIL!,
        SMTP_PASSWORD: process.env.SMTP_PASSWORD!,
        SMTP_HOST: process.env.SMTP_HOST!,
        SMTP_PORT: process.env.SMTP_PORT!,
      },
      dev: {
        port: 8787,
      },
    },
    greet: {
      name: "greet new users",
      source: "./functions/greet.ts",
      env: {
        SMTP_MAIL: process.env.SMTP_MAIL!,
        SMTP_PASSWORD: process.env.SMTP_PASSWORD!,
        SMTP_HOST: process.env.SMTP_HOST!,
        SMTP_PORT: process.env.SMTP_PORT!,
        GREET_SECRET: process.env.GREET_SECRET!,
      },
    },
  },
});
