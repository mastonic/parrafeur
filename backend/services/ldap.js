import ldap from 'ldapjs'
import db from '../db/database.js'

function getConfig() {
  const rows = db.prepare('SELECT key, value FROM config').all()
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
}

export async function ldapAuthenticate(username, password) {
  const cfg = getConfig()

  if (!cfg.ldap_url || !cfg.ldap_base_dn) {
    throw new Error('Configuration LDAP incomplète')
  }

  const client = ldap.createClient({
    url: cfg.ldap_url,
    tlsOptions: { rejectUnauthorized: false },
    timeout: 5000,
    connectTimeout: 5000,
  })

  return new Promise((resolve, reject) => {
    // 1. Bind avec le compte de service
    client.bind(cfg.ldap_bind_dn, cfg.ldap_bind_password, (err) => {
      if (err) {
        client.destroy()
        return reject(new Error('Connexion LDAP échouée : ' + err.message))
      }

      // 2. Recherche de l'utilisateur
      const filter = (cfg.ldap_user_filter || '(sAMAccountName={{username}})').replace('{{username}}', ldap.escapeFn(username))
      client.search(cfg.ldap_base_dn, { filter, scope: 'sub', attributes: ['dn', cfg.ldap_attr_nom, cfg.ldap_attr_prenom, cfg.ldap_attr_email, cfg.ldap_attr_service] }, (err, res) => {
        if (err) {
          client.destroy()
          return reject(new Error('Recherche LDAP échouée'))
        }

        let userEntry = null
        res.on('searchEntry', entry => { userEntry = entry })
        res.on('error', e => { client.destroy(); reject(e) })
        res.on('end', () => {
          if (!userEntry) {
            client.destroy()
            return reject(new Error('Utilisateur introuvable dans l\'annuaire'))
          }

          // 3. Bind avec les credentials de l'utilisateur pour valider le mot de passe
          client.bind(userEntry.dn, password, (err2) => {
            client.destroy()
            if (err2) return reject(new Error('Mot de passe incorrect'))

            const attrs = userEntry.pojo?.attributes || []
            const get = name => attrs.find(a => a.type === name)?.values?.[0] || ''

            resolve({
              nom: get(cfg.ldap_attr_nom),
              prenom: get(cfg.ldap_attr_prenom),
              email: get(cfg.ldap_attr_email),
              service: get(cfg.ldap_attr_service),
              ldap_dn: userEntry.dn,
            })
          })
        })
      })
    })
  })
}

export async function testLdapConnection(cfg) {
  const client = ldap.createClient({
    url: cfg.ldap_url,
    tlsOptions: { rejectUnauthorized: false },
    timeout: 5000,
    connectTimeout: 5000,
  })

  return new Promise((resolve, reject) => {
    client.bind(cfg.ldap_bind_dn, cfg.ldap_bind_password, (err) => {
      client.destroy()
      if (err) return reject(new Error(err.message))
      resolve(true)
    })
  })
}
