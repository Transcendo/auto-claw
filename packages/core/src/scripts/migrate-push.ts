import { closeDatabase, initializeDatabase } from '../db'

initializeDatabase()
closeDatabase()

console.log('[core] migrations applied')
