import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import configRoutes from './routes/config.js'
import parapheursRoutes from './routes/parapheurs.js'
import notificationsRoutes from './routes/notifications.js'
import cronRoutes from './routes/cron.js'

// Initialise la base de données au démarrage
import './db/database.js'

const app = express()

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')
app.use(cors({
  origin: (origin, cb) => {
    // Autorise les requêtes sans origine (same-origin, Vercel, etc.) et les origines listées
    if (!origin || allowedOrigins.some(o => origin.startsWith(o.trim()))) return cb(null, true)
    cb(new Error('CORS non autorisé'))
  },
  credentials: true
}))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/config', configRoutes)
app.use('/api/parapheurs', parapheursRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api', cronRoutes)

app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }))

// En mode serveur autonome (dev/prod self-hosted), on écoute sur le port
// Sur Vercel, ce fichier est importé comme module et app est exporté comme handler
if (process.env.STANDALONE === '1' || (!process.env.VERCEL && process.argv[1]?.endsWith('server.js'))) {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => console.log(`Parapheur API démarrée sur http://localhost:${PORT}`))
}

export default app
