import db from '../db/database.js'
import bcrypt from 'bcryptjs'

// Seed users
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

// Insert users
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, username, password, nom, prenom, email, service, role)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)

users.forEach(user => {
  insertUser.run(user.id, user.username, user.password, user.nom, user.prenom, user.email, user.service, user.role)
})

// Seed parapheurs (dossiers)
const parapheurs = [
  {
    id: 'dossier-deliberation-budget',
    titre: 'Délibération - Budget primitif 2025',
    description: 'Approbation du budget primitif pour l\'exercice 2025. Montant total : 45M€',
    service: 'Finances',
    createdBy: 'user-secretaire',
    statut: 'en_cours',
    steps: [
      { ordre: 1, nom: 'Vérification RH', assignedTo: 'user-rh', statut: 'complete' },
      { ordre: 2, nom: 'Validation Finances', assignedTo: 'user-finance', statut: 'complete' },
      { ordre: 3, nom: 'Signature Présidence', assignedTo: 'user-president', statut: 'en_attente' },
    ],
  },
  {
    id: 'dossier-marche-public',
    titre: 'Marché Public - Travaux voirie',
    description: 'Appel d\'offre pour réparation des routes communales. Budget : 2.5M€',
    service: 'Travaux Publics',
    createdBy: 'user-secretaire',
    statut: 'en_cours',
    steps: [
      { ordre: 1, nom: 'Vérification légale', assignedTo: 'user-dg', statut: 'complete' },
      { ordre: 2, nom: 'Validation budgétaire', assignedTo: 'user-finance', statut: 'en_cours' },
      { ordre: 3, nom: 'Approbation finale', assignedTo: 'user-president', statut: 'en_attente' },
    ],
  },
  {
    id: 'dossier-embauche',
    titre: 'Embauche - Agent technique',
    description: 'Contrat CDI pour poste d\'agent technique municipal. Salaire : 1800€/mois',
    service: 'RH',
    createdBy: 'user-secretaire',
    statut: 'en_cours',
    steps: [
      { ordre: 1, nom: 'Validation RH', assignedTo: 'user-rh', statut: 'complete' },
      { ordre: 2, nom: 'Approbation budgétaire', assignedTo: 'user-finance', statut: 'complete' },
      { ordre: 3, nom: 'Signature Direction', assignedTo: 'user-dg', statut: 'en_cours' },
    ],
  },
  {
    id: 'dossier-facture-urgent',
    titre: 'Facture urgente - Équipement électrique',
    description: 'Facture de fourniture électrique. Montant : 15 000€. Urgent !',
    service: 'Finances',
    createdBy: 'user-secretaire',
    statut: 'compllete',
    steps: [
      { ordre: 1, nom: 'Vérification facture', assignedTo: 'user-finance', statut: 'complete' },
      { ordre: 2, nom: 'Approbation', assignedTo: 'user-dg', statut: 'complete' },
    ],
  },
  {
    id: 'dossier-deliberation-fiscale',
    titre: 'Délibération - Fiscalité locale',
    description: 'Vote sur les taux de fiscalité pour 2025. Impact budgétaire : 1.2M€',
    service: 'Finances',
    createdBy: 'user-secretaire',
    statut: 'en_attente',
    steps: [
      { ordre: 1, nom: 'Examen commission', assignedTo: 'user-finance', statut: 'en_attente' },
      { ordre: 2, nom: 'Approbation DG', assignedTo: 'user-dg', statut: 'en_attente' },
      { ordre: 3, nom: 'Signature Présidence', assignedTo: 'user-president', statut: 'en_attente' },
    ],
  },
]

// Insert parapheurs with steps
parapheurs.forEach(p => {
  const parData = {
    users: p.steps.map(s => ({ userId: s.assignedTo, statut: s.statut })),
    titre: p.titre,
    description: p.description,
    service: p.service,
    numero: Math.floor(Math.random() * 10000),
  }

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO parapheurs (id, data, created_by, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `)

  insertStmt.run(p.id, JSON.stringify(parData), p.createdBy)
})

console.log('✅ Données de démo créées avec succès!')
console.log('\n📋 Utilisateurs de test:')
console.log('=====================')
users.forEach(u => {
  console.log(`\n${u.prenom} ${u.nom} (${u.service})`)
  console.log(`  Email: ${u.email}`)
  console.log(`  Login: ${u.username} / CapSud2024!`)
  console.log(`  Rôle: ${u.role}`)
})
console.log('\n\n📁 Dossiers de démonstration:')
console.log('============================')
parapheurs.forEach(p => {
  console.log(`\n${p.titre}`)
  console.log(`  Statut: ${p.statut}`)
  console.log(`  Étapes: ${p.steps.length}`)
})
