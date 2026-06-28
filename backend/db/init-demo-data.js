import bcrypt from 'bcryptjs'

export function initDemoData(db) {
  const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get('frederic.allain')
  if (existingUser) {
    console.log('ℹ️  Demo data already exists, skipping initialization')
    return
  }

  console.log('🌱 Creating demo data...')

  const users = [
    { id: 'user-dg', username: 'frederic.allain', nom: 'Allain', prenom: 'Frédéric', email: 'frederic.allain@capsud.fr', service: 'Direction Générale', role: 'admin', password: bcrypt.hashSync('CapSud2024!', 10) },
    { id: 'user-finance', username: 'marie.denis', nom: 'Denis', prenom: 'Marie', email: 'marie.denis@capsud.fr', service: 'Finances', role: 'signateur', password: bcrypt.hashSync('CapSud2024!', 10) },
    { id: 'user-rh', username: 'claude.lestin', nom: 'Lestin', prenom: 'Claude', email: 'claude.lestin@capsud.fr', service: 'Ressources Humaines', role: 'signateur', password: bcrypt.hashSync('CapSud2024!', 10) },
    { id: 'user-secretaire', username: 'sylvie.louis', nom: 'Louis', prenom: 'Sylvie', email: 'sylvie.louis@capsud.fr', service: 'Secrétariat Général', role: 'lecteur', password: bcrypt.hashSync('CapSud2024!', 10) },
    { id: 'user-president', username: 'yves.dassimon', nom: 'Dassimon', prenom: 'Yves', email: 'president@capsud.fr', service: 'Présidence', role: 'signateur', password: bcrypt.hashSync('CapSud2024!', 10) },
    { id: 'user-lecteur', username: 'paul.leclerc', nom: 'Leclerc', prenom: 'Paul', email: 'paul.leclerc@capsud.fr', service: 'Affaires Générales', role: 'lecteur', password: bcrypt.hashSync('CapSud2024!', 10) },
  ]

  const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, username, password, nom, prenom, email, service, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  users.forEach(u => insertUser.run(u.id, u.username, u.password, u.nom, u.prenom, u.email, u.service, u.role))

  const now = new Date()
  const nowISO = now.toISOString()

  // Calculer les deadlines pour tester les notifications
  const getDeadline = (daysOffset) => {
    const d = new Date(now)
    d.setDate(d.getDate() + daysOffset)
    return d.toISOString()
  }

  const parapheurs = [
    {
      id: 'dossier-1',
      objet: 'Délibération - Budget primitif 2025',
      description: 'Approbation du budget primitif pour l\'exercice 2025. Montant total : 45M€',
      deadline: getDeadline(3),  // Deadline dans 3 jours
      circuit: [
        { userId: 'user-rh', nom: 'Claude Lestin' },
        { userId: 'user-finance', nom: 'Marie Denis' },
        { userId: 'user-president', nom: 'Yves Dassimon' },
      ],
      service: 'Finances',
      created_by: 'user-secretaire',
    },
    {
      id: 'dossier-2',
      objet: 'Marché Public - Travaux voirie',
      description: 'Appel d\'offre pour réparation des routes communales. Budget : 2.5M€',
      deadline: getDeadline(7),  // Deadline dans 7 jours
      circuit: [
        { userId: 'user-dg', nom: 'Frédéric Allain' },
        { userId: 'user-finance', nom: 'Marie Denis' },
        { userId: 'user-president', nom: 'Yves Dassimon' },
      ],
      service: 'Travaux Publics',
      created_by: 'user-secretaire',
    },
    {
      id: 'dossier-3',
      objet: 'Embauche - Agent technique',
      description: 'Contrat CDI pour poste d\'agent technique municipal. Salaire : 1800€/mois',
      deadline: getDeadline(-5),  // Deadline il y a 5 jours (en retard)
      circuit: [
        { userId: 'user-rh', nom: 'Claude Lestin' },
        { userId: 'user-finance', nom: 'Marie Denis' },
        { userId: 'user-dg', nom: 'Frédéric Allain' },
      ],
      service: 'RH',
      created_by: 'user-secretaire',
    },
    {
      id: 'dossier-4',
      objet: 'Facture urgente - Équipement électrique',
      description: 'Facture de fourniture électrique. Montant : 15 000€. Urgent !',
      deadline: getDeadline(-15),  // Deadline il y a 15 jours (très en retard)
      circuit: [
        { userId: 'user-finance', nom: 'Marie Denis' },
        { userId: 'user-dg', nom: 'Frédéric Allain' },
      ],
      service: 'Finances',
      created_by: 'user-secretaire',
    },
    {
      id: 'dossier-5',
      objet: 'Délibération - Fiscalité locale',
      description: 'Vote sur les taux de fiscalité pour 2025. Impact budgétaire : 1.2M€',
      deadline: null,  // Pas de deadline
      circuit: [
        { userId: 'user-finance', nom: 'Marie Denis' },
        { userId: 'user-dg', nom: 'Frédéric Allain' },
        { userId: 'user-president', nom: 'Yves Dassimon' },
      ],
      service: 'Finances',
      created_by: 'user-secretaire',
    },
  ]

  const insertParapheur = db.prepare('INSERT OR IGNORE INTO parapheurs (id, data, created_by) VALUES (?, ?, ?)')

  parapheurs.forEach(p => {
    const par = {
      id: p.id,
      reference: `PAR-${now.getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
      objet: p.objet,
      service: p.service,
      priorite: 'normal',
      notes: '',
      createdAt: nowISO,
      deadline: p.deadline || null,
      circuit: p.circuit.map((step, i) => ({
        userId: step.userId,
        nom: step.nom,
        ordre: i,
        statut: i === 0 ? 'en_cours' : 'en_attente',
        date: i === 0 ? nowISO : null,
        commentaire: '',
      })),
      statut: 'en_cours',
      history: [{ action: 'Création', date: nowISO, auteur: 'Système de démo' }],
      created_by: p.created_by,
    }
    insertParapheur.run(p.id, JSON.stringify(par), p.created_by)
  })

  console.log('✅ Demo data created successfully!')
  console.log('   - 6 users')
  console.log('   - 5 demo parapheurs')
}
