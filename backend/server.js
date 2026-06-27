import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import configRoutes from './routes/config.js'
import parapheursRoutes from './routes/parapheurs.js'

// Initialise la base de données au démarrage
import './db/database.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/config', configRoutes)
app.use('/api/parapheurs', parapheursRoutes)

app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }))

app.listen(PORT, () => {
  console.log(`Parapheur API démarrée sur http://localhost:${PORT}`)
})
