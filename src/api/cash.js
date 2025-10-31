import api from './axios';

export const getCashDaily = (date) =>
    api.get('/cash/daily', { params: { date } });
