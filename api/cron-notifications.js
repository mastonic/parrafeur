import db from '../backend/db/database.js'
import { getPendingNotifications, logNotification } from '../backend/services/notification-scheduler.js'

export default function handler(req, res) {
  // Vérifier le secret Vercel Cron
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const notifications = getPendingNotifications()

    notifications.forEach(notif => {
      logNotification(notif.parapheur.id, notif.type, notif.trigger)

      // Envoyer à tous les utilisateurs
      const users = db.prepare('SELECT id, email, prenom, nom FROM users WHERE actif = 1').all()

      users.forEach(user => {
        // Ici on peut ajouter l'envoi d'email, push notification, etc.
        console.log(`📬 Notification to ${user.email}: ${notif.message}`)

        // Pour Vercel, on peut utiliser une queue (Vercel Queues) ou envoyer un webhook
        // Pour maintenant, on log simplement
      })
    })

    res.json({
      ok: true,
      sent: notifications.length,
      notifications: notifications.map(n => ({
        parapheur: n.parapheur.reference,
        type: n.type,
        message: n.message,
      })),
    })
  } catch (err) {
    console.error('Cron error:', err)
    res.status(500).json({ error: err.message })
  }
}
