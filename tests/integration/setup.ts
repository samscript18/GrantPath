import "dotenv/config";
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.includes("test"))
  throw new Error("TEST_DATABASE_URL must name an isolated test database.");
process.env.DATABASE_URL = url;
process.env.APP_ENV = "test";
process.env.EMAIL_MODE = "sink";
process.env.BETTER_AUTH_URL = "http://127.0.0.1:3000";
process.env.TRUSTED_ORIGINS = "http://127.0.0.1:3000";
// OAuth fixtures are configured only in the dedicated Google integration suite.
delete process.env.GOOGLE_CLIENT_ID;
delete process.env.GOOGLE_CLIENT_SECRET;
