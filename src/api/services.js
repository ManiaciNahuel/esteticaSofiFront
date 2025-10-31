import api from './axios';
export const getServices = () => api.get('/services');
