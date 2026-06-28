import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendNotificationEmail(notification, recipient) {
  if (!resend) {
    console.log('⚠️  RESEND_API_KEY non configurée, email non envoyé')
    console.log(`   To: ${recipient.email}`)
    console.log(`   Subject: ${notification.message}`)
    return { ok: false, reason: 'API key not configured' }
  }

  const emailBody = buildEmailBody(notification, recipient)

  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'notifications@parapheur.capsud.fr',
      to: recipient.email,
      subject: `📋 Parapheur: ${notification.message.split(':')[0]}`,
      html: emailBody,
    })

    if (result.error) {
      console.error(`❌ Erreur envoi email à ${recipient.email}:`, result.error)
      return { ok: false, error: result.error }
    }

    console.log(`✅ Email envoyé à ${recipient.email} (${result.data.id})`)
    return { ok: true, id: result.data.id }
  } catch (err) {
    console.error(`❌ Erreur lors de l'envoi à ${recipient.email}:`, err.message)
    return { ok: false, error: err.message }
  }
}

export async function sendNotificationEmailBatch(notifications, recipients) {
  const results = []

  for (const notif of notifications) {
    for (const recipient of recipients) {
      const result = await sendNotificationEmail(notif, recipient)
      results.push({ notification: notif.message, recipient: recipient.email, ...result })
    }
  }

  return results
}

function buildEmailBody(notification, recipient) {
  const iconMap = {
    '🔔': 'Rappel de deadline',
    '⚠️': 'Deadline aujourd\'hui',
    '🔴': 'Dossier en retard',
    '⏱️': 'Dossier bloqué',
  }

  const icon = notification.message.split(' ')[0]
  const type = iconMap[icon] || 'Notification'

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1A5276; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .message { font-size: 16px; font-weight: 600; margin: 20px 0; }
          .footer { color: #999; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; }
          .btn { display: inline-block; padding: 12px 24px; background: #1A5276; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Parapheur Numérique</h1>
            <p>${type}</p>
          </div>
          <div class="content">
            <p>Bonjour ${recipient.nom || 'utilisateur'},</p>

            <div class="message">
              ${notification.message}
            </div>

            <p>Connectez-vous à Parapheur pour consulter le dossier et effectuer les actions nécessaires.</p>

            <a href="https://parrafeur.vercel.app" class="btn">Consulter le dossier</a>

            <div class="footer">
              <p>Cette notification a été générée automatiquement par le système Parapheur de CAP SUD.</p>
              <p>Ne répondez pas à cet email.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}
