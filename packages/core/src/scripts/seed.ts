import { initializeAutoClawConfig } from '../app-config'
import { seedDefaultEnvironment } from '../openclaw/config'

initializeAutoClawConfig()
const seeded = await seedDefaultEnvironment()

if (seeded) {
  console.log(`[core] seeded environment: ${seeded.openclawPath}`)
}
else {
  console.log('[core] no default environment seeded')
}
