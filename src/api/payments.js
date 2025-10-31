import api from './axios';

export const addPayments = (appointmentId, payments) =>
    api.post(`/payments/${appointmentId}`, payments);

export const getPayments = (appointmentId) =>
    api.get(`/payments/${appointmentId}`);

export const createPayments = (appointment_id, payments) =>
    api.post("/payments", { appointment_id, payments });