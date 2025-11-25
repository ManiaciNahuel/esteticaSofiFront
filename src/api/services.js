import api from './axios';

// Obtener servicios activos (para uso en formularios)
export const getServices = () => api.get('/services');

// Obtener todos los servicios (para administración)
export const getAllServices = () => api.get('/services/admin');

// Crear nuevo servicio
export const createService = (data) => api.post('/services', data);

// Actualizar servicio
export const updateService = (id, data) => api.patch(`/services/${id}`, data);

// Eliminar servicio
export const deleteService = (id) => api.delete(`/services/${id}`);

// Obtener estadísticas del servicio
export const getServiceStats = (id) => api.get(`/services/${id}/stats`);

// Obtener información sobre las prioridades disponibles
export const getPrioritiesInfo = () => api.get('/services/priorities/info');
