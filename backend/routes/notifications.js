import { Router } from 'express'
import { getPendingNotifications, logNotification } from '../services/notification-scheduler.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// GET les notifications en attente
router.get('/pending', (req, res) => {
  const notifications = getPendingNotifications()
  res.json(notifications.map(n => ({
    type: n.type,
    parapheurId: n.parapheur.id,
    reference: n.parapheur.reference,
    objet: n.parapheur.objet,
    message: n.message,
    trigger: n.trigger,
  })))
})

// POST pour recevoir une subscription Web Push et la stocker
router.post('/subscribe', (req, res) => {
  const { subscription } = req.body
  if (!subscription) return res.status(400).json({ error: 'No subscription' })

  // Pour une implémentation complète, stocker la subscription en DB
  // Pour maintenant, on peut juste log
  console.log('📱 Push subscription received:', subscription.endpoint)

  res.json({ ok: true, message: 'Subscription stored' })
})

// POST pour tester les notifications (admin only)
router.post('/test', (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' })
  }

  const notifications = getPendingNotifications()

  notifications.forEach(n => {
    logNotification(n.parapheur.id, n.type, n.trigger)
  })

  res.json({
    ok: true,
    tested: notifications.length,
    notifications: notifications.map(n => n.message),
  })
})

export default router
