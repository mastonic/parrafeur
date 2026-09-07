import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import configRoutes from './routes/config.js'
import parapheursRoutes from './routes/parapheurs.js'

import './db/database.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/config', configRoutes)
app.use('/api/parapheurs', parapheursRoutes)

app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }))

const isStandalone = process.env.STANDALONE === '1' ||
  (!process.env.VERCEL && process.argv[1]?.endsWith('server.js'))

if (isStandalone) {
  app.listen(PORT, () => {
    console.log(`Parapheur API démarrée sur http://localhost:${PORT}`)
  })
}

export default app
