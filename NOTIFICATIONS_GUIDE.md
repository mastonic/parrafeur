# 🔔 Système de Notifications Push - Guide Complet

## Vue d'ensemble

Le système de notifications envoie automatiquement des **rappels programmés** aux utilisateurs aux points clés du cycle de vie d'un parapheur.

## ⏰ Points de Trigger

### Avant la deadline (Rappels progressifs)

| Trigger | Timing | Message |
|---------|--------|---------|
| **J-7** | 7 jours avant | 🔔 Échéance dans 7 jours |
| **J-5** | 5 jours avant | 🔔 Échéance dans 5 jours |
| **J-2** | 2 jours avant | 🔔 Échéance dans 2 jours |
| **J-0** | Le jour même | ⚠️ **Deadline AUJOURD'HUI!** |

### Après la deadline (Alertes de retard)

| Trigger | Timing | Message |
|---------|--------|---------|
| **J+3** | 3 jours en retard | 🔴 EN RETARD de 3 jours |
| **J+6** | 6 jours en retard | 🔴 EN RETARD de 6 jours |
| **J+10** | 10 jours en retard | 🔴 EN RETARD de 10 jours |

## 🏗️ Architecture

### Composants

1. **Service Scheduler** (`backend/services/notification-scheduler.js`)
   - Identifie les dossiers qui doivent recevoir un rappel
   - Calcule le nombre de jours jusqu'à la deadline
   - Gère les triggers de retard

2. **Base de Données** (`notification_log`)
   - Enregistre chaque notification envoyée
   - Empêche les doublons (chaque rappel = une seule fois)
   - Unique par: `(parapheur_id, trigger_type, days_offset)`

3. **Cron Job** (Vercel Crons)
   - S'exécute **chaque jour à 08:00 UTC**
   - Endpoint: `GET /api/cron-notifications`
   - Envoie toutes les notifications en attente

4. **Service Worker** (`public/sw-custom.js`)
   - Reçoit les notifications push
   - Les affiche sur l'écran du navigateur
   - Gère les interactions utilisateur

5. **UI Admin** (`src/components/admin/NotificationsAdmin.jsx`)
   - Affiche les notifications en attente
   - Permet de tester l'envoi manuel
   - Montre la configuration des triggers

## 🚀 Configuration Vercel

### vercel.json

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

**Schedule**: `0 8 * * *` = Tous les jours à 8:00 AM UTC

## 🔐 Sécurité

### Variable d'environnement requise

À ajouter dans Vercel Project Settings:

```
CRON_SECRET=votre-secret-aleatoire-tres-long
```

Le cron job vérifie ce secret dans l'header `Authorization`:

```javascript
if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
  return res.status(401).json({ error: 'Unauthorized' })
}
```

## 📊 Flux de notification

```
1. Cron job s'exécute (08:00 UTC)
   ↓
2. getPendingNotifications() identifie les rappels à envoyer
   ↓
3. Pour chaque notification:
   - Vérifie qu'elle n'a pas été envoyée (notification_log)
   - Enregistre dans la DB (logNotification)
   - Envoie à tous les utilisateurs actifs
   ↓
4. Notifications reçues dans le navigateur
   ↓
5. Service Worker affiche une notification native
```

## 🧪 Test Manual

### Via UI Admin

1. Allez dans **Administration** (icône ⚙️)
2. Cliquez sur l'onglet **Notifications**
3. Cliquez sur **"Envoyer les notifications"**
4. Les notifications en attente sont listées et envoyées

### Via API

```bash
# Lister les notifications en attente
curl -H "Authorization: Bearer $TOKEN" \
  https://parrafeur.vercel.app/api/notifications/pending

# Tester l'envoi
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://parrafeur.vercel.app/api/notifications/test
```

## 💾 Prévention des doublons

Chaque notification est enregistrée avec une clé unique:

```sql
UNIQUE(parapheur_id, trigger_type, days_offset)
```

Cela signifie:
- ✅ Chaque rappel est envoyé **une seule fois**
- ✅ Pas de spam (même si le cron s'exécute plusieurs fois)
- ✅ Historique complet des rappels envoyés

## 🎯 Cas d'usage

### Exemple 1: Dossier normal

```
Créé:      01/07/2026
Deadline:  15/07/2026
━━━━━━━━━━━━━━━━━━━━━━━━━
08/07 → Notification J-7 ✅
10/07 → Notification J-5 ✅
13/07 → Notification J-2 ✅
15/07 → Notification J-0 ✅ (DEADLINE)
```

### Exemple 2: Dossier en retard

```
Créé:      01/07/2026
Deadline:  15/07/2026
━━━━━━━━━━━━━━━━━━━━━━━━━
18/07 → Notification J+3 ✅ (3 jours retard)
21/07 → Notification J+6 ✅ (1 semaine retard)
25/07 → Notification J+10 ✅ (10 jours retard)
```

## 🔄 Intégrations futures

Le système est conçu pour supporter:

### 1. **Email** (à implémenter)
```javascript
// Envoyer un email via SendGrid/Mailgun
await sendEmail(user.email, notification.message)
```

### 2. **Slack** (à implémenter)
```javascript
// Envoyer une notification Slack
await postSlack(user.slackId, notification.message)
```

### 3. **SMS** (à implémenter)
```javascript
// Envoyer un SMS via Twilio
await sendSMS(user.phone, notification.message)
```

### 4. **Web Push** (à implémenter)
```javascript
// Envoyer une Web Push Notification
await sendWebPush(user.subscription, notification)
```

## 📝 Notes d'implémentation

### Points importants

1. **Pas de doublons**: La table `notification_log` empêche les envois multiples
2. **Timezone**: Les calculs utilisent UTC (j-days = écart en jours calendaires)
3. **Dossiers sans deadline**: Ignorés du système (pas de rappels)
4. **Dossiers complétés**: Ignorés après validation (pas de rappels)

### Performance

- Scans quotidiens (1x par jour = 365x/an)
- Requête DB rapide (index sur `parapheur_id`, `trigger_type`)
- Timeout: 60 secondes (largement suffisant)
- Coût Vercel: < 1¢/mois

## 🐛 Debugging

### Vérifier les logs du cron

```bash
# Via Vercel CLI
vercel logs --function cron-notifications

# Via Dashboard Vercel
# → Logs → Voir les exécutions du cron
```

### Vérifier les notifications envoyées

```bash
# Query la table notification_log
SELECT * FROM notification_log 
WHERE created_at > datetime('now', '-1 day')
ORDER BY created_at DESC;
```

### Re-tester une notification

```bash
# Supprimer l'entry dans notification_log
DELETE FROM notification_log 
WHERE parapheur_id = 'dossier-1' AND trigger_type = 'before' AND days_offset = -7;

# Re-lancer le test depuis l'UI Admin
```

## 🎨 Customization

### Modifier les triggers

Éditer `backend/services/notification-scheduler.js`:

```javascript
const REMINDER_TRIGGERS = [
  { name: 'before', days: [-7, -5, -2, 0] },      // Vos triggers
  { name: 'overdue', days: [3, 6, 10] }
]
```

### Modifier le schedule du cron

Éditer `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron-notifications",
      "schedule": "0 8 * * *"  // Changez cette ligne
    }
  ]
}
```

Formats supportés: [Cron syntax](https://crontab.guru/)

---

**Déployé sur**: Production Vercel  
**Statut**: ✅ Opérationnel  
**Support**: CAP SUD Martinique
