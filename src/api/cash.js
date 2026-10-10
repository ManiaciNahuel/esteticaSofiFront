import api from './axios';

export const getCashDaily = (date) =>
    api.get('/cash/daily', { params: { date } });

export const getCashRange = (from, to) =>
    api.get('/cash/daily', { params: { from, to } });
