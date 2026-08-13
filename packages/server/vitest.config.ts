import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { defineConfig } from 'vitest/config'

function findEnvFile(): string {
  let dir = process.cwd()
  while (dir !== path.dirname(dir)) {
    const envPath = path.join(dir, '.env')
    if (fs.existsSync(envPath)) return envPath
    dir = path.dirname(dir)
  }
  return path.join(process.cwd(), '.env')
}

dotenv.config({ path: findEnvFile() })

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 10000,
  },
})
