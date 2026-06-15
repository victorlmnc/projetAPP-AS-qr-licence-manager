import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(process.cwd(), 'server', 'database.json');
const ADMIN_KEY = 'INSA-AS-ADMIN-KEY-2026-SECURITY-ACTIVE99'; // Fixed 40-character key

app.use(cors());
app.use(express.json());

// In-memory database structure (Starts empty)
let db = {
  adherents: [],
  users: []
};

// In-memory sessions (token -> user)
const sessions = new Map();

// Helper to save DB to file
function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

// Database initialization
async function initDB() {
  const serverDir = path.dirname(DB_FILE);
  if (!fs.existsSync(serverDir)) {
    fs.mkdirSync(serverDir, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      console.log('Database loaded successfully.');
      return;
    } catch (e) {
      console.warn('Error reading database, starting fresh.');
    }
  }

  console.log('Initializing empty database...');
  db = {
    adherents: [],
    users: []
  };
  saveDB();
  console.log('Database initialized empty.');
}

// --- AUTHENTICATION MIDDLEWARE ---

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Connexion requise.' });
  }

  const sessionUser = sessions.get(token);
  if (!sessionUser) {
    return res.status(403).json({ error: 'Session expirée ou invalide.' });
  }

  const freshUser = db.users.find(u => u.id === sessionUser.id);
  if (!freshUser) {
    return res.status(403).json({ error: 'Utilisateur introuvable.' });
  }

  const { password_hash, ...profile } = freshUser;
  req.user = profile;
  next();
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès interdit.' });
    }
    next();
  };
}

// --- API ROUTES ---

// 1) Setup Status: check if any admin exists
app.get('/api/setup/status', (req, res) => {
  const hasAdmin = db.users.some(u => u.role === 'bureau');
  res.json({ initialized: hasAdmin });
});

// 2) Setup Initialize: verify key and create primary admin
app.post('/api/setup/initialize', async (req, res) => {
  const { key, login, password } = req.body;

  const hasAdmin = db.users.some(u => u.role === 'bureau');
  if (hasAdmin) {
    return res.status(400).json({ error: "L'application est déjà initialisée." });
  }

  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Clé d'activation de 40 caractères incorrecte." });
  }

  if (!login || !password || !login.trim() || !password.trim()) {
    return res.status(400).json({ error: "L'identifiant et le mot de passe sont requis." });
  }

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const adminUser = {
      id: crypto.randomUUID(),
      login: login.trim(),
      password_hash: passwordHash,
      role: 'bureau',
      adherent_id: null,
      nom: 'Bureau',
      prenom: 'Admin',
      created_at: new Date().toISOString()
    };

    db.users.push(adminUser);
    saveDB();
    console.log('Primary administrator account initialized.');
    res.status(201).json({ success: true, message: 'Administrateur créé avec succès.' });
  } catch (error) {
    console.error('Setup initialization error:', error);
    res.status(500).json({ error: "Erreur lors de la création du compte administrateur." });
  }
});

// 3) Setup Destroy: wipe all database contents using security key
app.post('/api/setup/destroy', authenticateToken, authorizeRoles('bureau'), (req, res) => {
  const { key } = req.body;

  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Clé de sécurité incorrecte. Destruction annulée." });
  }

  try {
    db.adherents = [];
    db.users = [];
    sessions.clear(); // Invalidate all session tokens
    saveDB();
    console.log('Database wiped completely by administrator.');
    res.json({ success: true, message: 'Base de données réinitialisée avec succès.' });
  } catch (error) {
    console.error('Database destruction error:', error);
    res.status(500).json({ error: 'Erreur lors de la destruction de la base de données.' });
  }
});

// 4) Auth - Login
app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Saisir identifiant et mot de passe.' });
  }

  const user = db.users.find(u => u.login.toLowerCase() === login.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
  }

  const token = crypto.randomUUID();
  const { password_hash, ...profile } = user;
  sessions.set(token, profile);

  res.json({ token, user: profile });
});

// 5) Auth - Current profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// 5b) Auth - Change current user's password
app.put('/api/auth/password', authenticateToken, async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caracteres.' });
  }

  const userIndex = db.users.findIndex(u => u.id === req.user.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'Utilisateur introuvable.' });
  }

  try {
    db.users[userIndex].password_hash = await bcrypt.hash(password, 10);
    saveDB();
    res.json({ success: true });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du mot de passe.' });
  }
});

// 6) Users - List all (Bureau only)
app.get('/api/users', authenticateToken, authorizeRoles('bureau'), (req, res) => {
  const list = db.users.map(({ password_hash, ...u }) => u);
  res.json(list);
});

// 7) Users - Create (Bureau only)
app.post('/api/users', authenticateToken, authorizeRoles('bureau'), async (req, res) => {
  const { login, password, role, adherent_id, nom, prenom } = req.body;

  if (!login || !password || !role) {
    return res.status(400).json({ error: 'Identifiant, mot de passe et rôle requis.' });
  }

  if (db.users.some(u => u.login.toLowerCase() === login.toLowerCase())) {
    return res.status(400).json({ error: 'Cet identifiant existe déjà.' });
  }

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = {
      id: crypto.randomUUID(),
      login: login.trim(),
      password_hash: passwordHash,
      role,
      adherent_id: adherent_id || null,
      nom: nom || '',
      prenom: prenom || '',
      created_at: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDB();

    const { password_hash: _, ...profile } = newUser;
    res.status(201).json(profile);
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ error: "Erreur lors de la création de l'utilisateur." });
  }
});

// 8) Adherents - Get all (Bureau & Coach only)
app.get('/api/adherents', authenticateToken, authorizeRoles('bureau', 'coach'), (req, res) => {
  const sorted = [...db.adherents].sort((a, b) => a.nom.localeCompare(b.nom));
  res.json(sorted);
});

// 9) Adherents - Get single (Bureau, Coach, or the Adherent themselves)
app.get('/api/adherents/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  if (req.user.role === 'adherent' && req.user.adherent_id !== id) {
    return res.status(403).json({ error: 'Accès interdit.' });
  }

  const adherent = db.adherents.find(a => a.id === id);
  if (!adherent) {
    return res.status(404).json({ error: 'Adhérent introuvable.' });
  }
  res.json(adherent);
});

// 10) Adherents - Create (Bureau only)
app.post('/api/adherents', authenticateToken, authorizeRoles('bureau'), (req, res) => {
  const { nom, prenom } = req.body;
  if (!nom || !prenom || !nom.trim() || !prenom.trim()) {
    return res.status(400).json({ error: 'Nom et prénom obligatoires.' });
  }

  const newAdherent = {
    id: crypto.randomUUID(),
    nom: nom.trim(),
    prenom: prenom.trim(),
    email: req.body.email || null,
    fiche_renseignement: !!req.body.fiche_renseignement,
    paiement_global: !!req.body.paiement_global,
    manque_paiement: !!req.body.manque_paiement,
    manque_yeps: !!req.body.manque_yeps,
    manque_passsport: !!req.body.manque_passsport,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.adherents.push(newAdherent);
  saveDB();
  res.status(201).json(newAdherent);
});

// 10b) Adherents - Bulk import (Bureau only)
app.post('/api/adherents/import', authenticateToken, authorizeRoles('bureau'), (req, res) => {
  const adherents = Array.isArray(req.body.adherents) ? req.body.adherents : [];
  const created = [];

  for (const item of adherents) {
    const nom = item.nom?.trim();
    const prenom = item.prenom?.trim();
    const email = item.email?.trim();

    if (!nom || !prenom || !email) {
      continue;
    }

    const paiementGlobal = !!item.paiement_global;
    const newAdherent = {
      id: crypto.randomUUID(),
      nom,
      prenom,
      email,
      fiche_renseignement: !!item.fiche_renseignement,
      paiement_global: paiementGlobal,
      manque_paiement: paiementGlobal ? false : !!item.manque_paiement,
      manque_yeps: paiementGlobal ? false : !!item.manque_yeps,
      manque_passsport: paiementGlobal ? false : !!item.manque_passsport,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.adherents.push(newAdherent);
    created.push(newAdherent);
  }

  saveDB();
  res.status(201).json(created);
});

// 11) Adherents - Update (Bureau only)
app.put('/api/adherents/:id', authenticateToken, authorizeRoles('bureau'), (req, res) => {
  const { id } = req.params;
  const index = db.adherents.findIndex(a => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Adhérent introuvable.' });
  }

  const { nom, prenom } = req.body;
  if (nom !== undefined && (!nom || !nom.trim())) {
    return res.status(400).json({ error: 'Le nom ne peut pas être vide.' });
  }
  if (prenom !== undefined && (!prenom || !prenom.trim())) {
    return res.status(400).json({ error: 'Le prénom ne peut pas être vide.' });
  }

  const current = db.adherents[index];
  const updated = {
    ...current,
    nom: nom !== undefined ? nom.trim() : current.nom,
    prenom: prenom !== undefined ? prenom.trim() : current.prenom,
    email: req.body.email !== undefined ? req.body.email : current.email,
    fiche_renseignement: req.body.fiche_renseignement !== undefined ? !!req.body.fiche_renseignement : current.fiche_renseignement,
    paiement_global: req.body.paiement_global !== undefined ? !!req.body.paiement_global : current.paiement_global,
    manque_paiement: req.body.manque_paiement !== undefined ? !!req.body.manque_paiement : current.manque_paiement,
    manque_yeps: req.body.manque_yeps !== undefined ? !!req.body.manque_yeps : current.manque_yeps,
    manque_passsport: req.body.manque_passsport !== undefined ? !!req.body.manque_passsport : current.manque_passsport,
    updated_at: new Date().toISOString()
  };

  db.adherents[index] = updated;

  const linkedUserIndex = db.users.findIndex(u => u.adherent_id === id);
  if (linkedUserIndex !== -1) {
    db.users[linkedUserIndex].nom = updated.nom;
    db.users[linkedUserIndex].prenom = updated.prenom;
  }

  saveDB();
  res.json(updated);
});

// 12) Adherents - Delete (Bureau only)
app.delete('/api/adherents/:id', authenticateToken, authorizeRoles('bureau'), (req, res) => {
  const { id } = req.params;
  const index = db.adherents.findIndex(a => a.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Adherent introuvable.' });
  }

  db.adherents.splice(index, 1);

  for (const user of db.users) {
    if (user.adherent_id === id) {
      user.adherent_id = null;
    }
  }

  saveDB();
  res.json({ success: true });
});

// Run server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
