import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Request failed';
    return Promise.reject(new Error(msg));
  }
);

// Cards
export const getCards = (params = {}) => api.get('/cards', { params }).then(r => r.data);
export const getCard = (id) => api.get(`/cards/${id}`).then(r => r.data);
export const createCard = (data) => api.post('/cards', data).then(r => r.data);
export const updateCard = (id, data) => api.put(`/cards/${id}`, data).then(r => r.data);
export const deleteCard = (id) => api.delete(`/cards/${id}`).then(r => r.data);
export const refreshCardPrice = (id) => api.post(`/cards/${id}/refresh-price`).then(r => r.data);

// eBay
export const getEbayListings = (params = {}) => api.get('/ebay', { params }).then(r => r.data);
export const createEbayListing = (data) => api.post('/ebay', data).then(r => r.data);
export const updateEbayListing = (id, data) => api.put(`/ebay/${id}`, data).then(r => r.data);
export const markEbaySold = (id, data) => api.put(`/ebay/${id}/sold`, data).then(r => r.data);
export const deleteEbayListing = (id) => api.delete(`/ebay/${id}`).then(r => r.data);

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats').then(r => r.data);
export const getDashboardCharts = () => api.get('/dashboard/charts').then(r => r.data);
export const getSettings = () => api.get('/dashboard/settings').then(r => r.data);
export const updateSettings = (data) => api.put('/dashboard/settings', data).then(r => r.data);

// Pokemon TCG
export const searchPokemon = (params) => api.get('/pokemon/search', { params }).then(r => r.data);
export const getPokemonSets = () => api.get('/pokemon/sets').then(r => r.data);

// Import/Export
export const importCards = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/import/cards', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};
export const exportCards = () => window.open('/api/export/cards', '_blank');
export const exportEbay = () => window.open('/api/export/ebay', '_blank');

export default api;
