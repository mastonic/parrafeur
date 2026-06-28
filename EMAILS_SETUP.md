# 📧 Configuration des Emails - Notifications Push

## Vue d'ensemble

Le système de notifications envoie automatiquement des rappels par **email** aux utilisateurs via **Resend**.

## Architecture

```
Cron Job (08:00 UTC)
    ↓
GET /api/cron-notifications
    ↓
getPendingNotifications()  ← Identifie les rappels à envoyer
    ↓
sendNotificationEmail()    ← Envoie via Resend
    ↓
Email reçu par l'utilisateur
```

## Configuration

### 1. Obtenir une clé Resend

1. Aller sur https://resend.com
2. S'inscrire (gratuit avec limite généreuse)
3. Créer une clé API dans Settings → API Keys
4. Copier la clé (commence par `re_`)

### 2. Ajouter les variables d'environnement

**Localement (`.env`):**
```
CRON_SECRET=votre-secret-random-long
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=notifications@parapheur.capsud.fr
```

**Sur Vercel (Settings → Environment Variables):**
```
CRON_SECRET=votre-secret-random-long
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=notifications@parapheur.capsud.fr
```

⚠️ **Sécurité**: La clé API ne doit jamais être commitée en git!

### 3. Vérifier la configuration

```bash
# Tester localement
curl -H "Authorization: Bearer votre-secret-random-long" \
  http://localhost:3001/api/cron-notifications

# Vérifier les logs
# Les emails envoyés apparaîtront dans les logs: "✅ Email envoyé à..."
```

## Flux des Emails

### 1. **Notification J-7** (7 jours avant deadline)
```
🔔 PAR-2026-5517: Échéance dans 7 jour(s) - "Marché Public"
```

### 2. **Notification J-0** (Deadline aujourd'hui)
```
⚠️ PAR-2026-5518: Deadline AUJOURD'HUI! "Budget Primitif"
```

### 3. **Notification J+3** (3 jours en retard)
```
🔴 PAR-2026-5519: EN RETARD de 3 jour(s)! "Facture Urgente"
```

## Template d'Email

Les emails incluent:
- ✅ Logo Parapheur
- ✅ Type de notification (Rappel/Urgent/Retard)
- ✅ Message de notification
- ✅ Bouton "Consulter le dossier"
- ✅ Footer d'information

## Triggers de Notification

### Avant deadline (rappels progressifs)
| Trigger | Jour | Message |
|---------|------|---------|
| J-7 | 7 jours avant | 🔔 Échéance dans 7 jours |
| J-5 | 5 jours avant | 🔔 Échéance dans 5 jours |
| J-2 | 2 jours avant | 🔔 Échéance dans 2 jours |
| J-0 | Le jour même | ⚠️ Deadline AUJOURD'HUI! |

### Après deadline (alertes de retard)
| Trigger | Jours en retard | Message |
|---------|-----------------|---------|
| J+3 | 3 jours | 🔴 EN RETARD de 3 jours |
| J+6 | 6 jours | 🔴 EN RETARD de 6 jours |
| J+10 | 10 jours | 🔴 EN RETARD de 10 jours |

## Cron Schedule

**Configuration Vercel** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron-notifications",
      "schedule": "0 8 * * *"
    }
  ]
}
```

- **Heure**: 08:00 UTC (ajustable)
- **Fréquence**: Tous les jours
- **Format Cron**: `0 8 * * *` ([Cron syntax](https://crontab.guru))

Pour changer l'heure, modifier le `schedule` (ex: `0 9 * * *` pour 09:00 UTC).

## Sécurité

### 1. Bearer Token
Le cron job utilise un Bearer token pour se sécuriser:

```bash
Authorization: Bearer CRON_SECRET
```

Vercel envoie automatiquement ce header lors de l'exécution du cron.

### 2. Vérification du Secret
La route cron vérifie que le secret correspond:

```javascript
if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
  return res.status(401).json({ error: 'Unauthorized' })
}
```

### 3. Rotation des Clés
- ✅ Changer le `CRON_SECRET` régulièrement
- ✅ Utiliser des clés API séparées par environnement
- ✅ Révoquer les anciennes clés

## Dépannage

### Emails non reçus
1. Vérifier que `RESEND_API_KEY` est valide
2. Vérifier que `RESEND_FROM_EMAIL` est configuré
3. Vérifier les logs du cron dans Vercel Dashboard

### Erreur "API key is invalid"
```
"statusCode":401,"name":"validation_error","message":"API key is invalid"
```
→ La clé Resend est incorrecte ou expirée. Vérifier sur https://resend.com

### Erreur "CRON_SECRET not configured"
→ La variable d'env `CRON_SECRET` n'est pas définie. L'ajouter à Vercel Settings.

### Les emails sont envoyés à tout le monde
→ C'est normal! Chaque notification est envoyée à **tous les utilisateurs actifs** pour qu'ils soient informés.

Pour limiter les destinataires, modifier `getNotificationChannels()` dans `notification-scheduler.js`.

## Prochaines Étapes

### 1. **SMS** (à implémenter)
```javascript
import twilio from 'twilio'
await sendSMS(user.phone, notification.message)
```

### 2. **Slack** (à implémenter)
```javascript
import slack from '@slack/web-api'
await postSlack(user.slackId, notification.message)
```

### 3. **Web Push** (à implémenter)
```javascript
import { sendNotifications } from 'web-push'
await sendNotifications(subscriptions, notification)
```

## Monitoring

### Voir les emails envoyés
**Vercel Dashboard → Functions → Logs**

Chercher pour: `"✅ Email envoyé"` ou `"❌ Erreur"`

### Statistiques des envois
Chaque exécution du cron retourne:
```json
{
  "notifications_found": 1,
  "emails_sent": 7,
  "duration_ms": 959
}
```

### Limite de Resend
- **Plan gratuit**: 100 emails/jour
- **Plan payant**: Sans limite
- Ajouter un webhook pour tracker les rebonds/spam

---

**Déployé sur**: Vercel + Resend  
**Statut**: ✅ Opérationnel  
**Support**: CAP SUD Martinique
