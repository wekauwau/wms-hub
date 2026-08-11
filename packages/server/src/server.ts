import dotenv from "dotenv";
import fs from "fs";
import path from "path";

function findEnvFile(): string {
  let dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    const envPath = path.join(dir, ".env");
    if (fs.existsSync(envPath)) return envPath;
    dir = path.dirname(dir);
  }
  return path.join(process.cwd(), ".env");
}

dotenv.config({ path: findEnvFile() });

import app from "./app.js";

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
