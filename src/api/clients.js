import api from './axios';

// Obtener todos los clientes
export const getClients = () => api.get('/clients');

// Buscar clientes por nombre
export const searchClients = (query) => api.get('/clients/search', { params: { q: query } });

// Crear un nuevo cliente
export const createClient = (data) => api.post('/clients', data);

// Actualizar cliente
export const updateClient = (id, data) => api.patch(`/clients/${id}`, data);

// Obtener estadísticas del cliente
export const getClientStats = (id) => api.get(`/clients/${id}/stats`);