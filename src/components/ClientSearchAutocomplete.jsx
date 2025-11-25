import { useState, useEffect, useRef } from 'react';
import {
    TextField,
    Box,
    List,
    ListItem,
    ListItemText,
    ListItemButton,
    Paper,
    Typography,
    Chip,
    CircularProgress,
    Divider
} from '@mui/material';
import { searchClients } from '../api/clients';
import dayjs from 'dayjs';

export default function ClientSearchAutocomplete({ 
    value = '', 
    onChange, 
    onSelect,
    placeholder = "Buscar cliente existente...",
    label = "👥 Cliente",
    disabled = false 
}) {
    const [searchTerm, setSearchTerm] = useState(value);
    const [searchResults, setSearchResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    
    const searchTimeoutRef = useRef(null);
    const inputRef = useRef(null);
    const resultsRef = useRef(null);

    // Sincronizar valor externo con valor local
    useEffect(() => {
        if (value !== searchTerm) {
            setSearchTerm(value);
        }
    }, [value, searchTerm]);

    // Función para realizar búsqueda
    const performSearch = async (query) => {
        if (!query || query.trim().length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        setIsLoading(true);
        try {
            const response = await searchClients(query.trim());
            setSearchResults(response.data || []);
            setShowResults(true);
            setSelectedIndex(-1);
        } catch (error) {
            console.error('Error al buscar clientes:', error);
            setSearchResults([]);
            setShowResults(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Manejar cambio en el input
    const handleInputChange = (event) => {
        const newValue = event.target.value;
        setSearchTerm(newValue);
        
        // Notificar cambio hacia arriba
        if (onChange) {
            onChange(newValue);
        }

        // Debounce search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        searchTimeoutRef.current = setTimeout(() => {
            performSearch(newValue);
        }, 300);
    };

    // Manejar selección de cliente
    const handleClientSelect = (client) => {
        setSearchTerm(client.full_name);
        setShowResults(false);
        setSelectedIndex(-1);
        
        if (onSelect) {
            onSelect(client);
        }
        
        if (onChange) {
            onChange(client.full_name);
        }
    };

    // Manejar navegación con teclado
    const handleKeyDown = (event) => {
        if (!showResults || searchResults.length === 0) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setSelectedIndex(prev => 
                    prev < searchResults.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                event.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                event.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
                    handleClientSelect(searchResults[selectedIndex]);
                } else if (searchResults.length === 1) {
                    handleClientSelect(searchResults[0]);
                }
                break;
            case 'Escape':
                setShowResults(false);
                setSelectedIndex(-1);
                break;
        }
    };

    // Cerrar resultados al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                inputRef.current && 
                !inputRef.current.contains(event.target) &&
                resultsRef.current && 
                !resultsRef.current.contains(event.target)
            ) {
                setShowResults(false);
                setSelectedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Limpiar timeout al desmontar
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    return (
        <Box sx={{ position: 'relative', width: '100%' }}>
            <TextField
                ref={inputRef}
                label={label}
                fullWidth
                variant="outlined"
                value={searchTerm}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                    if (searchResults.length > 0) {
                        setShowResults(true);
                    }
                }}
                placeholder={placeholder}
                disabled={disabled}
                InputProps={{
                    endAdornment: isLoading && (
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                    ),
                }}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        bgcolor: 'white'
                    }
                }}
            />

            {showResults && searchResults.length > 0 && (
                <Paper
                    ref={resultsRef}
                    sx={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1300,
                        maxHeight: '300px',
                        overflow: 'auto',
                        mt: 0.5,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        border: '1px solid',
                        borderColor: 'rgba(0,0,0,0.08)'
                    }}
                >
                    <List sx={{ p: 0 }}>
                        {searchResults.map((client, index) => (
                            <ListItem key={client.id} sx={{ p: 0 }}>
                                <ListItemButton
                                    onClick={() => handleClientSelect(client)}
                                    selected={index === selectedIndex}
                                    sx={{
                                        py: 1.5,
                                        px: 2,
                                        '&.Mui-selected': {
                                            bgcolor: 'primary.50',
                                            '&:hover': {
                                                bgcolor: 'primary.100',
                                            }
                                        },
                                        '&:hover': {
                                            bgcolor: 'grey.50'
                                        }
                                    }}
                                >
                                    <ListItemText
                                        primary={
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {client.full_name}
                                                </Typography>
                                                {client.total_appointments > 0 && (
                                                    <Chip
                                                        label={`${client.total_appointments} turnos`}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ 
                                                            fontSize: '0.7rem',
                                                            height: 20,
                                                            color: 'primary.main',
                                                            borderColor: 'primary.main'
                                                        }}
                                                    />
                                                )}
                                            </Box>
                                        }
                                        secondary={
                                            <>
                                                {client.phone && (
                                                    <Typography variant="caption" display="block" component="span">
                                                        📱 {client.phone}
                                                    </Typography>
                                                )}
                                                {client.last_appointment && (
                                                    <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
                                                        Último turno: {dayjs(client.last_appointment).format('DD/MM/YYYY')}
                                                    </Typography>
                                                )}
                                            </>
                                        }
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                        
                        {searchTerm && searchTerm.trim().length >= 2 && (
                            <>
                                <Divider />
                                <ListItem sx={{ p: 0 }}>
                                    <ListItemButton
                                        onClick={() => {
                                            // Crear nuevo cliente con el nombre escrito
                                            const newClient = {
                                                id: null, // Indica que es nuevo
                                                full_name: searchTerm.trim(),
                                                phone: '',
                                                total_appointments: 0
                                            };
                                            handleClientSelect(newClient);
                                        }}
                                        sx={{
                                            py: 1.5,
                                            px: 2,
                                            bgcolor: 'success.50',
                                            '&:hover': {
                                                bgcolor: 'success.100'
                                            }
                                        }}
                                    >
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body2" sx={{ 
                                                        fontWeight: 600,
                                                        color: 'success.main'
                                                    }}>
                                                        ➕ Crear nuevo: "{searchTerm.trim()}"
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                <Typography variant="caption" component="span" sx={{ color: 'success.dark' }}>
                                                    Este cliente no existe, se creará automáticamente
                                                </Typography>
                                            }
                                        />
                                    </ListItemButton>
                                </ListItem>
                            </>
                        )}
                    </List>
                </Paper>
            )}
        </Box>
    );
}