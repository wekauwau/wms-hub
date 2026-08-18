import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

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

import { getEnv } from './config/env.js'
getEnv()

import app from './app.js'
import { createRealtimeServer } from './realtime/server.js'

const { PORT } = getEnv()

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

createRealtimeServer(server)
