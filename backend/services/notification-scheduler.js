import { v4 as uuid } from 'uuid'
import db from '../db/database.js'

// Points de trigger pour les rappels (en jours)
// Les triggers "avant" sont positifs (jours avant deadline)
// Les triggers "après" sont négatifs (jours en retard)
const REMINDER_TRIGGERS = [
  { name: 'before', days: [7, 5, 2, 0] },        // avant deadline
  { name: 'overdue', days: [-3, -6, -10] }       // après deadline (en retard)
]

export function getPendingNotifications() {
  const rows = db.prepare('SELECT * FROM parapheurs ORDER BY updated_at DESC').all()
  const parapheurs = rows.map(r => JSON.parse(r.data))
  const notifications = []
  const now = new Date()

  parapheurs.forEach(par => {
    // Ignorer les dossiers validés/archivés/refusés
    if (par.statut !== 'en_cours') return
    if (!par.deadline) return

    const deadline = new Date(par.deadline)
    const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))

    // Vérifier les triggers avant deadline
    REMINDER_TRIGGERS[0].days.forEach(triggerDay => {
      if (diffDays === triggerDay) {
        const logKey = `${par.id}-before-${triggerDay}`
        const exists = db.prepare(
          'SELECT id FROM notification_log WHERE parapheur_id = ? AND trigger_type = ? AND days_offset = ?'
        ).get(par.id, 'before', triggerDay)

        if (!exists) {
          notifications.push({
            type: 'deadline_reminder',
            trigger: triggerDay,
            parapheur: par,
            message: buildDeadlineMessage(par, triggerDay),
          })
        }
      }
    })

    // Vérifier les triggers après deadline (retard)
    if (diffDays < 0) {
      REMINDER_TRIGGERS[1].days.forEach(triggerDay => {
        if (diffDays === triggerDay) {  // triggerDay est négatif (ex: -3)
          const exists = db.prepare(
            'SELECT id FROM notification_log WHERE parapheur_id = ? AND trigger_type = ? AND days_offset = ?'
          ).get(par.id, 'overdue', triggerDay)

          if (!exists) {
            notifications.push({
              type: 'overdue_reminder',
              trigger: triggerDay,
              parapheur: par,
              message: buildOverdueMessage(par, Math.abs(triggerDay)),  // Passer la valeur abs pour le message
            })
          }
        }
      })
    }

    // Alerter si une étape est bloquée trop longtemps
    const currentStep = par.circuit.find(s => s.statut === 'en_cours')
    if (currentStep?.date) {
      const stepAge = Math.ceil((now - new Date(currentStep.date)) / (1000 * 60 * 60 * 24))
      if (stepAge >= 3 && stepAge % 3 === 0) {
        const logKey = `${par.id}-blocked-${stepAge}`
        const exists = db.prepare(
          'SELECT id FROM notification_log WHERE parapheur_id = ? AND trigger_type = ? AND days_offset = ?'
        ).get(par.id, 'blocked', stepAge)

        if (!exists) {
          notifications.push({
            type: 'step_blocked',
            trigger: stepAge,
            parapheur: par,
            message: `⏱️ ${par.reference}: En attente depuis ${stepAge} jours (${currentStep.nom || currentStep.role})`,
          })
        }
      }
    }
  })

  return notifications
}

export function logNotification(parapheurId, type, daysOffset) {
  const id = uuid()
  db.prepare(
    'INSERT OR IGNORE INTO notification_log (id, parapheur_id, trigger_type, days_offset) VALUES (?, ?, ?, ?)'
  ).run(id, parapheurId, type, daysOffset)
}

function buildDeadlineMessage(par, daysOffset) {
  if (daysOffset === 0) {
    return `⚠️ ${par.reference}: Deadline AUJOURD'HUI! "${par.objet}"`
  }
  // daysOffset est positif pour les triggers before
  return `🔔 ${par.reference}: Échéance dans ${daysOffset} jour(s) - "${par.objet}"`
}

function buildOverdueMessage(par, daysOffset) {
  return `🔴 ${par.reference}: EN RETARD de ${daysOffset} jour(s)! "${par.objet}"`
}

export function getNotificationChannels() {
  // Récupérer les utilisateurs avec Web Push Support
  const users = db.prepare(
    'SELECT id, email FROM users WHERE actif = 1'
  ).all()

  return users.map(u => ({
    type: 'email',
    target: u.email,
    userId: u.id,
  }))
}
