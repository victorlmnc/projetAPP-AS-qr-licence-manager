// Client API pour communiquer avec le backend Express + SQLite.

const TOKEN_KEY = 'licence_qr_auth_token';

// Helper pour effectuer des requêtes fetch avec le token d'authentification
async function request(endpoint, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Une erreur est survenue.');
  }

  return data;
}

export const api = {
  // Connexion
  async login(login, password) {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password })
    });
    
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }
    return data;
  },

  // Déconnexion
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    return Promise.resolve();
  },

  // Vérifier la session de l'utilisateur connecté
  async getMe() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    
    try {
      return await request('/api/auth/me');
    } catch (error) {
      // Si le token est invalide ou expiré, on nettoie
      localStorage.removeItem(TOKEN_KEY);
      throw error;
    }
  },

  // Récupérer tous les adhérents (Bureau & Coach)
  async getAdherents() {
    return request('/api/adherents');
  },

  // Récupérer un adhérent par ID
  async getAdherent(id) {
    return request(`/api/adherents/${id}`);
  },

  // Créer un nouvel adhérent (Bureau uniquement)
  async createAdherent(adherentData) {
    return request('/api/adherents', {
      method: 'POST',
      body: JSON.stringify(adherentData)
    });
  },

  async importAdherents(adherents) {
    return request('/api/adherents/import', {
      method: 'POST',
      body: JSON.stringify({ adherents })
    });
  },

  // Mettre à jour un adhérent existant (Bureau uniquement)
  async updateAdherent(id, adherentData) {
    return request(`/api/adherents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(adherentData)
    });
  },

  async deleteAdherent(id) {
    return request(`/api/adherents/${id}`, {
      method: 'DELETE'
    });
  },

  async updatePassword(password) {
    return request('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ password })
    });
  },

  // Récupérer le statut d'initialisation de la base de données
  async getSetupStatus() {
    return request('/api/setup/status');
  },

  // Initialiser la base de données avec le premier compte administrateur
  async initializeSetup(key, login, password) {
    return request('/api/setup/initialize', {
      method: 'POST',
      body: JSON.stringify({ key, login, password })
    });
  },

  // Détruire et réinitialiser complètement la base de données
  async destroyDatabase(key) {
    return request('/api/setup/destroy', {
      method: 'POST',
      body: JSON.stringify({ key })
    });
  },

  // Récupérer la liste des utilisateurs (Bureau uniquement)
  async getUsers() {
    return request('/api/users');
  },

  // Créer un nouvel utilisateur (Bureau uniquement)
  async createUser(userData) {
    return request('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }
};
