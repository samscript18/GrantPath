import "dotenv/config";
import { readEnv } from "../src/lib/env";
try {
  const env = readEnv();
  console.log(`Configuration valid. Environment: ${env.APP_ENV}. Email: ${env.EMAIL_MODE}.`);
  if (env.EMAIL_MODE === "sink")
    console.log(
      "Emails are captured in the local EmailSink database table; they are not delivered to recipients.",
    );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid environment");
  process.exitCode = 1;
}
