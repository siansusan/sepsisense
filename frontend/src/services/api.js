/**
 * api.js
 * Service layer for calling SepsisSense API endpoints.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchJson(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Set JSON content-type and add auth token if present
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  const token = localStorage.getItem('sepsis_sense_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch (e) {
      // Ignored: keep default message
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export const apiService = {
  /**
   * Log in clinical analyst
   */
  async login(username, password) {
    const data = await fetchJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.token) {
      localStorage.setItem('sepsis_sense_token', data.token);
      localStorage.setItem('sepsis_sense_user', JSON.stringify(data.user));
    }
    return data;
  },

  /**
   * Log out clinician
   */
  logout() {
    localStorage.removeItem('sepsis_sense_token');
    localStorage.removeItem('sepsis_sense_user');
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!localStorage.getItem('sepsis_sense_token');
  },

  /**
   * Get logged-in user profile
   */
  getUser() {
    try {
      return JSON.parse(localStorage.getItem('sepsis_sense_user'));
    } catch (e) {
      return null;
    }
  },

  /**
   * Get dashboard high level stats
   */
  async getOverview() {
    return fetchJson('/api/overview');
  },

  /**
   * Get paginated patient list with clinical filters
   */
  async getPatients({ page = 1, limit = 10, ward = '', cohort = '', searchId = null }) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (ward) params.append('ward', ward);
    if (cohort) params.append('cohort', cohort);
    if (searchId !== null && searchId !== undefined && searchId !== '') {
      params.append('search_id', searchId.toString());
    }
    
    return fetchJson(`/api/patients?${params.toString()}`);
  },

  /**
   * Get individual patient trajectory and vitals timeline
   */
  async getPatientDetail(patientId) {
    return fetchJson(`/api/patients/${patientId}`);
  },

  /**
   * Get nodes and edges of the transition graph
   */
  async getGraph(minEdgeWeight = 1) {
    return fetchJson(`/api/graph?min_edge_weight=${minEdgeWeight}`);
  },

  /**
   * Get discovered pathways and validation reports
   */
  async getPathways() {
    return fetchJson('/api/pathways');
  },

  /**
   * Run custom parameter-adaptive ACO simulation
   */
  async runSimulation({ alpha, beta, rhoDefault, nAnts, nIterations, mcBootstraps, seed }) {
    return fetchJson('/api/run-simulation', {
      method: 'POST',
      body: JSON.stringify({
        alpha: parseFloat(alpha),
        beta: parseFloat(beta),
        rho_default: parseFloat(rhoDefault),
        n_ants: parseInt(nAnts),
        n_iterations: parseInt(nIterations),
        mc_bootstraps: parseInt(mcBootstraps),
        seed: parseInt(seed),
      }),
    });
  }
};
