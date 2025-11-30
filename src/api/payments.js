import api from './axios';

export const addPayments = (appointmentId, payments) =>
    api.post(`/payments/${appointmentId}`, payments);

export const getPayments = (appointmentId) =>
    api.get(`/payments/${appointmentId}`);

export const createPayments = (appointment_id, payments) =>
    api.post("/payments", { appointment_id, payments });

// Eliminar un pago específico
export const deletePayment = (paymentId) =>
    api.delete(`/payments/payment/${paymentId}`);