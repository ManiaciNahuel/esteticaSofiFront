import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Switch,
    Grid,
    Fab,
    Tooltip,
    Alert,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    InputAdornment
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    MoreVert as MoreVertIcon,
    Visibility as VisibilityIcon,
    BarChart as StatsIcon,
    AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';
import { getAllServices, createService, updateService, deleteService, getServiceStats, getPrioritiesInfo } from '../api/services';
import dayjs from 'dayjs';

export default function ServicesPage() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [statsDialogOpen, setStatsDialogOpen] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedServiceStats, setSelectedServiceStats] = useState(null);
    const [prioritiesInfo, setPrioritiesInfo] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [alert, setAlert] = useState({ open: false, message: '', severity: 'info' });
    const [form, setForm] = useState({
        name: '',
        base_price: '',
        base_duration_minutes: '60',
        category: '',
        orden_prioridad: '999',
        active: true
    });

    const showAlert = useCallback((message, severity = 'info') => {
        setAlert({ open: true, message, severity });
        setTimeout(() => setAlert({ open: false, message: '', severity: 'info' }), 4000);
    }, []);

    const loadPrioritiesInfo = useCallback(async () => {
        try {
            const response = await getPrioritiesInfo();
            setPrioritiesInfo(response.data);
        } catch (error) {
            console.error('Error al cargar información de prioridades:', error);
        }
    }, []);

    const loadServices = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getAllServices();
            setServices(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error al cargar servicios:', error);
            showAlert('Error al cargar servicios', 'error');
            setServices([]);
        } finally {
            setLoading(false);
        }
    }, [showAlert]);

    // Cargar servicios al montar el componente
    useEffect(() => {
        loadServices();
        loadPrioritiesInfo();
    }, [loadServices, loadPrioritiesInfo]);

    const handleOpenDialog = (service = null) => {
        if (service) {
            setSelectedService(service);
            setForm({
                name: service.name || '',
                base_price: service.base_price?.toString() || '',
                base_duration_minutes: service.base_duration_minutes?.toString() || '60',
                category: service.category || '',
                orden_prioridad: service.orden_prioridad?.toString() || '999',
                active: service.active ?? true
            });
        } else {
            setSelectedService(null);
            setForm({
                name: '',
                base_price: '',
                base_duration_minutes: '60',
                category: '',
                orden_prioridad: '999',
                active: true
            });
        }
        setDialogOpen(true);
        setAnchorEl(null);
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            showAlert('El nombre del servicio es requerido', 'error');
            return;
        }

        const newPriority = parseInt(form.orden_prioridad);
        const isOccupied = prioritiesInfo?.usedPriorities?.includes(newPriority);
        
        // Confirmar si se va a reorganizar
        if (!selectedService && isOccupied && newPriority !== 999) {
            const confirmMessage = `La prioridad ${newPriority} ya está ocupada. Al crear el servicio se moverán todos los servicios con prioridad ${newPriority} o mayor hacia abajo. ¿Continuar?`;
            if (!window.confirm(confirmMessage)) {
                return;
            }
        } else if (selectedService && isOccupied && newPriority !== 999) {
            const currentPriority = selectedService.orden_prioridad;
            if (currentPriority !== newPriority) {
                const confirmMessage = `La prioridad ${newPriority} ya está ocupada. Al actualizar se reorganizarán las prioridades automáticamente. ¿Continuar?`;
                if (!window.confirm(confirmMessage)) {
                    return;
                }
            }
        }

        try {
            const payload = {
                name: form.name.trim(),
                base_price: parseFloat(form.base_price) || 0,
                base_duration_minutes: parseInt(form.base_duration_minutes) || 60,
                category: form.category.trim() || null,
                orden_prioridad: newPriority,
                active: form.active
            };

            if (selectedService) {
                await updateService(selectedService.id, payload);
                showAlert('Servicio actualizado correctamente', 'success');
            } else {
                await createService(payload);
                showAlert('Servicio creado correctamente', 'success');
            }

            setDialogOpen(false);
            loadServices();
            loadPrioritiesInfo();
        } catch (error) {
            console.error('Error al guardar servicio:', error);
            const errorMessage = error.response?.data?.error || 'Error al guardar servicio';
            showAlert(errorMessage, 'error');
        }
    };

    const handleDelete = async (service) => {
        if (!window.confirm(`¿Estás seguro de que quieres eliminar el servicio "${service.name}"?`)) {
            return;
        }

        try {
            const response = await deleteService(service.id);
            showAlert(response.data.message, 'success');
            loadServices();
        } catch (error) {
            console.error('Error al eliminar servicio:', error);
            const errorMessage = error.response?.data?.error || 'Error al eliminar servicio';
            showAlert(errorMessage, 'error');
        }
        setAnchorEl(null);
    };

    const handleShowStats = async (service) => {
        try {
            const response = await getServiceStats(service.id);
            setSelectedServiceStats({ ...service, stats: response.data });
            setStatsDialogOpen(true);
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            showAlert('Error al obtener estadísticas', 'error');
        }
        setAnchorEl(null);
    };

    const handleMenuClick = (event, service) => {
        event.stopPropagation();
        setSelectedService(service);
        setAnchorEl(event.currentTarget);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount || 0);
    };

    const getCategoryColor = (category) => {
        const colors = {
            'Tratamiento Facial': 'primary',
            'Tratamiento Corporal': 'secondary',
            'Depilación': 'success',
            'Masajes': 'info',
            'Estética': 'warning',
            'Otros': 'default'
        };
        return colors[category] || 'default';
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    💅 Administración de Servicios
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {services.length} servicio(s) registrado(s)
                    {prioritiesInfo && (
                        <> • Prioridades usadas: {prioritiesInfo.usedPriorities.length > 0 
                            ? prioritiesInfo.usedPriorities.join(', ') 
                            : 'ninguna'}
                        </>
                    )}
                </Typography>
            </Box>

            {/* Alert */}
            {alert.open && (
                <Alert severity={alert.severity} sx={{ mb: 2 }} onClose={() => setAlert({ ...alert, open: false })}>
                    {alert.message}
                </Alert>
            )}

            {/* Services Table */}
            <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Orden</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Categoría</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Precio Base</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Duración</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    Cargando servicios...
                                </TableCell>
                            </TableRow>
                        ) : services.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    No hay servicios registrados
                                </TableCell>
                            </TableRow>
                        ) : (
                            services.map((service) => (
                                <TableRow key={service.id} hover sx={{ '&:hover': { bgcolor: 'grey.50' } }}>
                                    <TableCell>
                                        {service.orden_prioridad === 999 ? (
                                            <Chip 
                                                label="Sin prioridad" 
                                                size="small" 
                                                variant="outlined"
                                                color="default"
                                                sx={{ minWidth: 100 }}
                                            />
                                        ) : (
                                            <Chip 
                                                label={`#${service.orden_prioridad}`} 
                                                size="small" 
                                                color="primary"
                                                sx={{ minWidth: 60, fontWeight: 'bold' }}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {service.name}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {service.category ? (
                                            <Chip
                                                label={service.category}
                                                size="small"
                                                color={getCategoryColor(service.category)}
                                                variant="outlined"
                                            />
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                Sin categoría
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.main' }}>
                                            {formatCurrency(service.base_price)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {service.base_duration_minutes} min
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={service.active ? 'Activo' : 'Inactivo'}
                                            color={service.active ? 'success' : 'error'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => handleMenuClick(e, service)}
                                        >
                                            <MoreVertIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Floating Action Button */}
            <Tooltip title="Nuevo Servicio">
                <Fab
                    color="primary"
                    sx={{ position: 'fixed', bottom: 24, right: 24 }}
                    onClick={() => handleOpenDialog()}
                >
                    <AddIcon />
                </Fab>
            </Tooltip>

            {/* Context Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
            >
                <MenuItem onClick={() => handleOpenDialog(selectedService)}>
                    <ListItemIcon>
                        <EditIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Editar</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleShowStats(selectedService)}>
                    <ListItemIcon>
                        <StatsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Estadísticas</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem 
                    onClick={() => handleDelete(selectedService)}
                    sx={{ color: 'error.main' }}
                >
                    <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    <ListItemText>Eliminar</ListItemText>
                </MenuItem>
            </Menu>

            {/* Create/Edit Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        boxShadow: '0 24px 38px 3px rgba(0,0,0,0.14)'
                    }
                }}
            >
                <DialogTitle sx={{
                    fontWeight: 600,
                    fontSize: '1.4rem',
                    pb: 2,
                    pt: 3,
                    px: 4,
                    bgcolor: 'primary.50',
                    color: 'primary.main'
                }}>
                    {selectedService ? '✏️ Editar Servicio' : '➕ Nuevo Servicio'}
                </DialogTitle>
                <DialogContent sx={{ mt: 3, px: 4, pb: 2 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="🏷️ Nombre del Servicio"
                                fullWidth
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="📂 Categoría"
                                fullWidth
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                placeholder="Ej: Tratamiento Facial"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="💰 Precio Base"
                                fullWidth
                                type="number"
                                value={form.base_price}
                                onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                                InputProps={{
                                    startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>$</Typography>
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="⏱️ Duración Base (minutos)"
                                fullWidth
                                type="number"
                                value={form.base_duration_minutes}
                                onChange={(e) => setForm({ ...form, base_duration_minutes: e.target.value })}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="📊 Orden de Prioridad"
                                fullWidth
                                type="number"
                                value={form.orden_prioridad}
                                onChange={(e) => setForm({ ...form, orden_prioridad: e.target.value })}
                                helperText={
                                    form.orden_prioridad === '999' 
                                        ? "999 = Sin prioridad específica" 
                                        : prioritiesInfo?.usedPriorities?.includes(parseInt(form.orden_prioridad))
                                            ? "⚠️ Esta prioridad está ocupada. Al guardar se reorganizarán las demás."
                                            : `Siguiente disponible: ${prioritiesInfo?.nextAvailable || 1}`
                                }
                                InputProps={{
                                    endAdornment: prioritiesInfo?.nextAvailable && (
                                        <InputAdornment position="end">
                                            <Tooltip title={`Usar siguiente disponible: ${prioritiesInfo.nextAvailable}`}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setForm({ ...form, orden_prioridad: prioritiesInfo.nextAvailable.toString() })}
                                                >
                                                    <AutoAwesomeIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </InputAdornment>
                                    )
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2
                                    },
                                    '& .MuiFormHelperText-root': {
                                        color: prioritiesInfo?.usedPriorities?.includes(parseInt(form.orden_prioridad)) 
                                            ? 'warning.main' 
                                            : 'text.secondary'
                                    }
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ pt: 2 }}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={form.active}
                                            onChange={(e) => setForm({ ...form, active: e.target.checked })}
                                        />
                                    }
                                    label="Servicio activo"
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 4, py: 3, gap: 2 }}>
                    <Button
                        onClick={() => setDialogOpen(false)}
                        sx={{ borderRadius: 2, px: 3 }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        sx={{ borderRadius: 2, px: 4 }}
                    >
                        {selectedService ? 'Actualizar' : 'Crear'} Servicio
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Stats Dialog */}
            <Dialog
                open={statsDialogOpen}
                onClose={() => setStatsDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    📊 Estadísticas: {selectedServiceStats?.name}
                </DialogTitle>
                <DialogContent>
                    {selectedServiceStats?.stats && (
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">
                                    Total de turnos
                                </Typography>
                                <Typography variant="h6">
                                    {selectedServiceStats.stats.total_appointments}
                                </Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">
                                    Turnos completados
                                </Typography>
                                <Typography variant="h6">
                                    {selectedServiceStats.stats.completed_appointments}
                                </Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">
                                    Precio promedio
                                </Typography>
                                <Typography variant="h6">
                                    {formatCurrency(selectedServiceStats.stats.average_price)}
                                </Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2" color="text.secondary">
                                    Ingresos totales
                                </Typography>
                                <Typography variant="h6" color="success.main">
                                    {formatCurrency(selectedServiceStats.stats.total_revenue)}
                                </Typography>
                            </Grid>
                            {selectedServiceStats.stats.last_appointment && (
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">
                                        Último turno
                                    </Typography>
                                    <Typography variant="body1">
                                        {dayjs(selectedServiceStats.stats.last_appointment).format('DD/MM/YYYY HH:mm')}
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setStatsDialogOpen(false)}>
                        Cerrar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}