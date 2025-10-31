import api from './axios';

export const getAppointments = (from, to) =>
    api.get('/appointments', { params: { from, to } });

export const createAppointment = (data) =>
    api.post('/appointments', data);

export const updateAppointment = (id, data) =>
    api.patch(`/appointments/${id}`, data);

export const deleteAppointment = (id) =>
    api.delete(`/appointments/${id}`);
