import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db, initDB } from './database.js';

const app = express();
const PORT = process.env.PORT || 5000;
const ADMIN_KEY = 'INSA-AS-ADMIN-KEY-2026-SECURITY-ACTIVE99'; // Clé fixe 40 caractères

app.use(cors());
app.use(express.json());

// Sessions en mémoire (token -> user)
const sessions = new Map();

// --- HELPERS ---

// Convertit un row SQLite (integers 0/1) en objet avec booleans
function rowToAdherent(row) {
  return {
    ...row,
    fiche_renseignement: !!row.fiche_renseignement,
    paiement_global: !!row.paiement_global,
    manque_paiement: !!row.manque_paiement,
    manque_yeps: !!row.manque_yeps,
    manque_passsport: !!row.manque_passsport,
  };
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

  // Vérifier que l'utilisateur existe encore en base
  const freshUser = db.prepare('SELECT id, login, role, adherent_id, nom, prenom, created_at FROM users WHERE id = ?').get(sessionUser.id);
  if (!freshUser) {
    return res.status(403).json({ error: 'Utilisateur introuvable.' });
  }

  req.user = freshUser;
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

// 1) Setup Status
app.get('/api/setup/status', (req, res) => {
  const row = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'bureau'").get();
  res.json({ initialized: row.count > 0 });
});

// 2) Setup Initialize
app.post('/api/setup/initialize', async (req, res) => {
  const { key, login, password } = req.body;

  const row = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'bureau'").get();
  if (row.count > 0) {
    return res.status(400).json({ error: "L'application est déjà initialisée." });
  }

  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Clé d'activation de 40 caractères incorrecte." });
  }

  if (!login || !password || !login.trim() || !password.trim()) {
    return res.status(400).json({ error: "L'identifiant et le mot de passe sont requis." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare('INSERT INTO users (id, login, password_hash, role, adherent_id, nom, prenom, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, login.trim(), passwordHash, 'bureau', null, 'Bureau', 'Admin', now);

    console.log('Compte administrateur principal créé.');
    res.status(201).json({ success: true, message: 'Administrateur créé avec succès.' });
  } catch (error) {
    console.error('Setup initialization error:', error);
    res.status(500).json({ error: "Erreur lors de la création du compte administrateur." });
  }
});

// 3) Setup Destroy
app.post('/api/setup/destroy', authenticateToken, authorizeRoles('bureau'), (req, res) => {
  const { key } = req.body;

  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Clé de sécurité incorrecte. Destruction annulée." });
  }

  db.prepare('DELETE FROM adherents').run();
  db.prepare('DELETE FROM users').run();
  sessions.clear();

  console.log('Base de données vidée par l\'administrateur.');
  res.json({ success: true, message: 'Base de données réinitialisée avec succès.' });
});

// 4) Auth - Login
app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Saisir identifiant et mot de passe.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE login = ? COLLATE NOCASE').get(login);
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

// 5b) Auth - Change password
app.put('/api/auth/password', authenticateToken, async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caracteres.' });
  }

  try {
    const newHash = await bcrypt.hash(password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du mot de passe.' });
  }
});

// 6) Users - List all (Bureau only)
app.get('/api/users', authenticateToken, authorizeRoles('bureau'), (req, res) => {
  const users = db.prepare('SELECT id, login, role, adherent_id, nom, prenom, created_at FROM users').all();
  res.json(users);
});

// 7) Users - Create (Bureau only)
app.post('/api/users', authenticateToken, authorizeRoles('bureau'), async (req, res) => {
  const { login, password, role, adherent_id, nom, prenom } = req.body;

  if (!login || !password || !role) {
    return res.status(400).json({ error: 'Identifiant, mot de passe et rôle requis.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE login = ? COLLATE NOCASE').get(login);
  if (existing) {
    return res.status(400).json({ error: 'Cet identifiant existe déjà.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare('INSERT INTO users (id, login, password_hash, role, adherent_id, nom, prenom, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, login.trim(), passwordHash, role, adherent_id || null, nom || '', prenom || '', now);

    res.status(201).json({ id, login: login.trim(), role, adherent_id: adherent_id || null, nom: nom || '', prenom: prenom || '', created_at: now });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ error: "Erreur lors de la création de l'utilisateur." });
  }
});

// 8) Adherents - Get all (Bureau & Coach only)
app.get('/api/adherents', authenticateToken, authorizeRoles('bureau', 'coach'), (req, res) => {
  const rows = db.prepare('SELECT * FROM adherents ORDER BY nom ASC').all();
  res.json(rows.map(rowToAdherent));
});

// 9) Adherents - Get single
app.get('/api/adherents/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  if (req.user.role === 'adherent' && req.user.adherent_id !== id) {
    return res.status(403).json({ error: 'Accès interdit.' });
  }

  const row = db.prepare('SELECT * FROM adherents WHERE id = ?').get(id);
  if (!row) {
    return res.status(404).json({ error: 'Adhérent introuvable.' });
  }

  res.json(rowToAdherent(row));
});

// 10) Adherents - Create (Bureau only)
app.post('/api/adherents', authenticateToken, authorizeRoles('bureau'), (req, res) => {
  const { nom, prenom } = req.body;
  if (!nom || !prenom || !nom.trim() || !prenom.trim()) {
    return res.status(400).json({ error: 'Nom et prénom obligatoires.' });
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`INSERT INTO adherents (id, nom, prenom, email, fiche_renseignement, paiement_global, manque_paiement, manque_yeps, manque_passsport, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, nom.trim(), prenom.trim(), req.body.email || null,
      req.body.fiche_renseignement ? 1 : 0, req.body.paiement_global ? 1 : 0,
      req.body.manque_paiement ? 1 : 0, req.body.manque_yeps ? 1 : 0,
      req.body.manque_passsport ? 1 : 0, now, now);

  res.status(201).json({
    id, nom: nom.trim(), prenom: prenom.trim(), email: req.body.email || null,
    fiche_renseignement: !!req.body.fiche_renseignement, paiement_global: !!req.body.paiement_global,
    manque_paiement: !!req.body.manque_paiement, manque_yeps: !!req.body.manque_yeps,
    manque_passsport: !!req.body.manque_passsport, created_at: now, updated_at: now,
  });
});

// 10b) Adherents - Bulk import (Bureau only)
app.post('/api/adherents/import', authenticateToken, authorizeRoles('bureau'), (req, res) => {
  const adherents = Array.isArray(req.body.adherents) ? req.body.adherents : [];
  const created = [];

  const insertStmt = db.prepare(`INSERT INTO adherents (id, nom, prenom, email, fiche_renseignement, paiement_global, manque_paiement, manque_yeps, manque_passsport, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      const nom = item.nom?.trim();
      const prenom = item.prenom?.trim();
      const email = item.email?.trim();
      if (!nom || !prenom || !email) continue;

      const paiementGlobal = !!item.paiement_global;
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      insertStmt.run(id, nom, prenom, email,
        item.fiche_renseignement ? 1 : 0, paiementGlobal ? 1 : 0,
        paiementGlobal ? 0 : (item.manque_paiement ? 1 : 0),
        paiementGlobal ? 0 : (item.manque_yeps ? 1 : 0),
        paiementGlobal ? 0 : (item.manque_passsport ? 1 : 0),
        now, now);

      created.push({
        id, nom, prenom, email,
        fiche_renseignement: !!item.fiche_renseignement, paiement_global: paiementGlobal,
        manque_paiement: paiementGlobal ? false : !!item.manque_paiement,
        manque_yeps: paiementGlobal ? false : !!item.manque_yeps,
        manque_passsport: paiementGlobal ? false : !!item.manque_passsport,
        created_at: now, updated_at: now,
      });
    }
  });

  insertMany(adherents);
  res.status(201).json(created);
});

// 11) Adherents - Update (Bureau only)
app.put('/api/adherents/:id', authenticateToken, authorizeRoles('bureau'), (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM adherents WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Adhérent introuvable.' });
  }

  const current = rowToAdherent(existing);
  const { nom, prenom } = req.body;

  if (nom !== undefined && (!nom || !nom.trim())) {
    return res.status(400).json({ error: 'Le nom ne peut pas être vide.' });
  }
  if (prenom !== undefined && (!prenom || !prenom.trim())) {
    return res.status(400).json({ error: 'Le prénom ne peut pas être vide.' });
  }

  const updNom = nom !== undefined ? nom.trim() : current.nom;
  const updPrenom = prenom !== undefined ? prenom.trim() : current.prenom;
  const updEmail = req.body.email !== undefined ? req.body.email : current.email;
  const updFiche = req.body.fiche_renseignement !== undefined ? !!req.body.fiche_renseignement : current.fiche_renseignement;
  const updPaiement = req.body.paiement_global !== undefined ? !!req.body.paiement_global : current.paiement_global;
  const updManquePaiement = req.body.manque_paiement !== undefined ? !!req.body.manque_paiement : current.manque_paiement;
  const updManqueYeps = req.body.manque_yeps !== undefined ? !!req.body.manque_yeps : current.manque_yeps;
  const updManquePasssport = req.body.manque_passsport !== undefined ? !!req.body.manque_passsport : current.manque_passsport;
  const now = new Date().toISOString();

  db.prepare(`UPDATE adherents SET nom=?, prenom=?, email=?, fiche_renseignement=?, paiement_global=?, manque_paiement=?, manque_yeps=?, manque_passsport=?, updated_at=? WHERE id=?`)
    .run(updNom, updPrenom, updEmail, updFiche ? 1 : 0, updPaiement ? 1 : 0,
      updManquePaiement ? 1 : 0, updManqueYeps ? 1 : 0, updManquePasssport ? 1 : 0, now, id);

  // Mettre à jour nom/prénom dans users si lié
  db.prepare('UPDATE users SET nom=?, prenom=? WHERE adherent_id=?').run(updNom, updPrenom, id);

  res.json({
    ...current, nom: updNom, prenom: updPrenom, email: updEmail,
    fiche_renseignement: updFiche, paiement_global: updPaiement,
    manque_paiement: updManquePaiement, manque_yeps: updManqueYeps,
    manque_passsport: updManquePasssport, updated_at: now,
  });
});

// 12) Adherents - Delete (Bureau only)
app.delete('/api/adherents/:id', authenticateToken, authorizeRoles('bureau'), (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT id FROM adherents WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Adherent introuvable.' });
  }

  db.prepare('DELETE FROM adherents WHERE id = ?').run(id);
  db.prepare('UPDATE users SET adherent_id = NULL WHERE adherent_id = ?').run(id);

  res.json({ success: true });
});

// Démarrage
initDB();
app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});
