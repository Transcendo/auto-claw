import { closeDatabase, initializeDatabase } from '../db'
import { seedDefaultEnvironment } from '../openclaw/config'

initializeDatabase()
const seeded = await seedDefaultEnvironment()
closeDatabase()

if (seeded) {
  console.log(`[core] seeded environment: ${seeded.openclawPath}`)
}
else {
  console.log('[core] no default environment seeded')
}
