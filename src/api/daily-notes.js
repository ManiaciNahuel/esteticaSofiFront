import axios from './axios';

// Obtener anotaciones de un día específico
export const getDailyNote = async (date) => {
    return await axios.get(`/daily-notes/${date}`);
};

// Crear o actualizar anotación diaria
export const saveDailyNote = async (date, content) => {
    return await axios.post('/daily-notes', { date, content });
};

// Eliminar anotación diaria
export const deleteDailyNote = async (date) => {
    return await axios.delete(`/daily-notes/${date}`);
};