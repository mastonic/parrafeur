import { Router } from 'express'
import { getPendingNotifications, logNotification, getNotificationChannels } from '../services/notification-scheduler.js'
import { sendNotificationEmail } from '../services/email-service.js'

const router = Router()

// Middleware de sécurité pour les crons
function verifyCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.authorization

  if (!secret) {
    return res.status(500).json({ error: 'CRON_SECRET not configured' })
  }

  if (!auth || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
}

// GET /api/cron-notifications - Endpoint pour Vercel Crons
router.get('/cron-notifications', verifyCronSecret, async (req, res) => {
  try {
    console.log('🔔 Exécution du cron de notifications')
    const startTime = Date.now()

    const notifications = getPendingNotifications()
    const recipients = getNotificationChannels()

    if (notifications.length === 0) {
      console.log('ℹ️  Aucune notification en attente')
      return res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        notifications_found: 0,
        emails_sent: 0,
      })
    }

    console.log(`📬 ${notifications.length} notification(s) en attente`)
    console.log(`👥 ${recipients.length} destinataire(s)`)

    let emailsSent = 0
    const emailResults = []

    // Enregistrer les notifications et envoyer les emails
    for (const notif of notifications) {
      let triggerType
      if (notif.type === 'deadline_reminder') triggerType = 'before'
      else if (notif.type === 'overdue_reminder') triggerType = 'overdue'
      else if (notif.type === 'step_blocked') triggerType = 'blocked'

      // Enregistrer dans la DB pour éviter les doublons
      logNotification(notif.parapheur.id, triggerType, notif.trigger)

      // Envoyer les emails
      for (const recipient of recipients) {
        try {
          const result = await sendNotificationEmail(notif, recipient)
          if (result.ok) {
            emailsSent++
          }
          emailResults.push({
            notification: notif.parapheur.reference,
            recipient: recipient.target,
            sent: result.ok,
            error: result.error || null,
          })
        } catch (err) {
          console.error(`❌ Erreur lors de l'envoi à ${recipient.target}:`, err.message)
          emailResults.push({
            notification: notif.parapheur.reference,
            recipient: recipient.target,
            sent: false,
            error: err.message,
          })
        }
      }
    }

    const duration = Date.now() - startTime
    console.log(`✅ Cron terminé en ${duration}ms`)
    console.log(`   - Notifications: ${notifications.length}`)
    console.log(`   - Emails envoyés: ${emailsSent}/${notifications.length * recipients.length}`)

    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      notifications_found: notifications.length,
      notifications: notifications.map(n => ({
        reference: n.parapheur.reference,
        message: n.message,
        trigger: n.trigger,
      })),
      emails_sent: emailsSent,
      email_results: emailResults,
      duration_ms: duration,
    })
  } catch (err) {
    console.error('❌ Erreur lors de l\'exécution du cron:', err)
    res.status(500).json({
      ok: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    })
  }
})

export default router
