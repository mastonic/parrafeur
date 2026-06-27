import bcrypt from 'bcryptjs'

export function initDemoData(db) {
  // Check if demo data already exists
  const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get('frederic.allain')
  if (existingUser) {
    console.log('ℹ️  Demo data already exists, skipping initialization')
    return
  }

  console.log('🌱 Creating demo data...')

  // Demo users
  const users = [
    {
      id: 'user-dg',
      username: 'frederic.allain',
      nom: 'Allain',
      prenom: 'Frédéric',
      email: 'frederic.allain@capsud.fr',
      service: 'Direction Générale',
      role: 'admin',
      password: bcrypt.hashSync('CapSud2024!', 10),
    },
    {
      id: 'user-finance',
      username: 'marie.denis',
      nom: 'Denis',
      prenom: 'Marie',
      email: 'marie.denis@capsud.fr',
      service: 'Finances',
      role: 'signateur',
      password: bcrypt.hashSync('CapSud2024!', 10),
    },
    {
      id: 'user-rh',
      username: 'claude.lestin',
      nom: 'Lestin',
      prenom: 'Claude',
      email: 'claude.lestin@capsud.fr',
      service: 'Ressources Humaines',
      role: 'signateur',
      password: bcrypt.hashSync('CapSud2024!', 10),
    },
    {
      id: 'user-secretaire',
      username: 'sylvie.louis',
      nom: 'Louis',
      prenom: 'Sylvie',
      email: 'sylvie.louis@capsud.fr',
      service: 'Secrétariat Général',
      role: 'lecteur',
      password: bcrypt.hashSync('CapSud2024!', 10),
    },
    {
      id: 'user-president',
      username: 'yves.dassimon',
      nom: 'Dassimon',
      prenom: 'Yves',
      email: 'president@capsud.fr',
      service: 'Présidence',
      role: 'signateur',
      password: bcrypt.hashSync('CapSud2024!', 10),
    },
    {
      id: 'user-lecteur',
      username: 'paul.leclerc',
      nom: 'Leclerc',
      prenom: 'Paul',
      email: 'paul.leclerc@capsud.fr',
      service: 'Affaires Générales',
      role: 'lecteur',
      password: bcrypt.hashSync('CapSud2024!', 10),
    },
  ]

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, username, password, nom, prenom, email, service, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  users.forEach(user => {
    insertUser.run(user.id, user.username, user.password, user.nom, user.prenom, user.email, user.service, user.role)
  })

  // Demo parapheurs
  const parapheurs = [
    {
      id: 'dossier-1',
      titre: 'Délibération - Budget primitif 2025',
      description: 'Approbation du budget primitif pour l\'exercice 2025. Montant total : 45M€',
      service: 'Finances',
      data: JSON.stringify({
        titre: 'Délibération - Budget primitif 2025',
        description: 'Approbation du budget primitif pour l\'exercice 2025. Montant total : 45M€',
        service: 'Finances',
        numero: 2025001,
        users: [
          { userId: 'user-rh', statut: 'complete' },
          { userId: 'user-finance', statut: 'complete' },
          { userId: 'user-president', statut: 'en_attente' },
        ],
      }),
      created_by: 'user-secretaire',
    },
    {
      id: 'dossier-2',
      titre: 'Marché Public - Travaux voirie',
      description: 'Appel d\'offre pour réparation des routes communales. Budget : 2.5M€',
      service: 'Travaux Publics',
      data: JSON.stringify({
        titre: 'Marché Public - Travaux voirie',
        description: 'Appel d\'offre pour réparation des routes communales. Budget : 2.5M€',
        service: 'Travaux Publics',
        numero: 2025002,
        users: [
          { userId: 'user-dg', statut: 'complete' },
          { userId: 'user-finance', statut: 'en_cours' },
          { userId: 'user-president', statut: 'en_attente' },
        ],
      }),
      created_by: 'user-secretaire',
    },
    {
      id: 'dossier-3',
      titre: 'Embauche - Agent technique',
      description: 'Contrat CDI pour poste d\'agent technique municipal. Salaire : 1800€/mois',
      service: 'RH',
      data: JSON.stringify({
        titre: 'Embauche - Agent technique',
        description: 'Contrat CDI pour poste d\'agent technique municipal. Salaire : 1800€/mois',
        service: 'RH',
        numero: 2025003,
        users: [
          { userId: 'user-rh', statut: 'complete' },
          { userId: 'user-finance', statut: 'complete' },
          { userId: 'user-dg', statut: 'en_cours' },
        ],
      }),
      created_by: 'user-secretaire',
    },
    {
      id: 'dossier-4',
      titre: 'Facture urgente - Équipement électrique',
      description: 'Facture de fourniture électrique. Montant : 15 000€. Urgent !',
      service: 'Finances',
      data: JSON.stringify({
        titre: 'Facture urgente - Équipement électrique',
        description: 'Facture de fourniture électrique. Montant : 15 000€. Urgent !',
        service: 'Finances',
        numero: 2025004,
        users: [
          { userId: 'user-finance', statut: 'complete' },
          { userId: 'user-dg', statut: 'complete' },
        ],
      }),
      created_by: 'user-secretaire',
    },
    {
      id: 'dossier-5',
      titre: 'Délibération - Fiscalité locale',
      description: 'Vote sur les taux de fiscalité pour 2025. Impact budgétaire : 1.2M€',
      service: 'Finances',
      data: JSON.stringify({
        titre: 'Délibération - Fiscalité locale',
        description: 'Vote sur les taux de fiscalité pour 2025. Impact budgétaire : 1.2M€',
        service: 'Finances',
        numero: 2025005,
        users: [
          { userId: 'user-finance', statut: 'en_attente' },
          { userId: 'user-dg', statut: 'en_attente' },
          { userId: 'user-president', statut: 'en_attente' },
        ],
      }),
      created_by: 'user-secretaire',
    },
  ]

  const insertParapheur = db.prepare(`
    INSERT OR IGNORE INTO parapheurs (id, data, created_by, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `)

  parapheurs.forEach(p => {
    insertParapheur.run(p.id, p.data, p.created_by)
  })

  console.log('✅ Demo data created successfully!')
  console.log('   - 6 users')
  console.log('   - 5 demo parapheurs')
}
