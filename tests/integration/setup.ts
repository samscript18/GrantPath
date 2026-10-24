import "dotenv/config";
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.includes("test"))
  throw new Error("TEST_DATABASE_URL must name an isolated test database.");
process.env.DATABASE_URL = url;
process.env.APP_ENV = "test";
process.env.EMAIL_MODE = "sink";
