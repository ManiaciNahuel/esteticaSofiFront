import { useEffect, useState } from "react";
import axios from "../api/axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
// Removed problematic locale import
import { Box, Fab, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Button, Grid } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import dayjs from "dayjs";
import { getAppointments, createAppointment, updateAppointment, deleteAppointment } from "../api/appointments";
import { getServices } from "../api/services";
import { getEmployees } from "../api/employees";
import { createPayments, getPayments } from "../api/payments";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import './CalendarPage.scss'; // Import SCSS styles


export default function CalendarPage() {
    const [events, setEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]); // Store all events
    const [services, setServices] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [visibleRange, setVisibleRange] = useState(null);
    const [isFetching, setIsFetching] = useState(false);
    const [open, setOpen] = useState(false);
    const [payments, setPayments] = useState([]);
    const [newPayment, setNewPayment] = useState({});
    const [form, setForm] = useState({
        employee_id: localStorage.getItem("employeeId") || "",
        service_id: "",
        client_name: "",
        client_phone: "",
        notes: "",
        start: "",
        end: "",
        final_price: "",
        final_duration_minutes: "",
    });

    // Load appointments when the component mounts
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const response = await axios.get("/appointments");
                const dataArray = Array.isArray(response.data) ? response.data : [];
                const mappedEvents = dataArray.map(a => ({
                    id: a.id,
                    title: `${a.client_name || "Cliente"} - ${a.service_name}`,
                    start: a.starts_at,
                    end: a.ends_at,
                    backgroundColor: a.employee_color || "#f48fb1",
                    borderColor: a.employee_color || "#f48fb1",
                    extendedProps: { ...a }
                }));
                setAllEvents(mappedEvents); // Store all events
                setEvents(mappedEvents); // Initialize visible events
            } catch (error) {
                console.error("Error fetching appointments:", error);
                setAllEvents([]);
                setEvents([]);
            }
        };

        fetchAppointments();
    }, []);

    useEffect(() => {
        getServices().then(res => setServices(Array.isArray(res.data) ? res.data : [])).catch(() => setServices([]));
        getEmployees().then(res => setEmployees(Array.isArray(res.data) ? res.data : [])).catch(() => setEmployees([]));
        refreshEvents();
    }, []);

    const refreshEvents = async (start, end) => {
        // Prevent concurrent fetches but allow queuing
        if (isFetching) {
            console.log('Already fetching, skipping concurrent request');
            return;
        }
        setIsFetching(true);
        try {
            // Prefer passed start/end, fallback to visibleRange, fallback to today
            const s = start || (visibleRange && visibleRange.start) || dayjs();
            const e = end || (visibleRange && visibleRange.end) || dayjs();
            const from = dayjs(s).format("YYYY-MM-DD");
            const to = dayjs(e).format("YYYY-MM-DD");
            
            console.log('Fetching appointments from', from, 'to', to);
            const { data } = await getAppointments(from, to);
            const dataArray = Array.isArray(data) ? data : [];
            const mapped = dataArray.map(a => ({
                id: a.id,
                title: `${a.client_name || "Cliente"} - ${a.service_name}`,
                start: a.starts_at,
                end: a.ends_at,
                backgroundColor: a.employee_color || "#f48fb1",
                borderColor: a.employee_color || "#f48fb1",
                extendedProps: { ...a }
            }));
            setAllEvents(mapped); // Update allEvents instead of events

            // Apply current filter if there's one
            const selectedEmployeeId = localStorage.getItem("employeeId");
            if (selectedEmployeeId) {
                const filteredEvents = mapped.filter(event => event.extendedProps.employee_id === Number(selectedEmployeeId));
                setEvents(filteredEvents);
            } else {
                setEvents(mapped);
            }
        } catch (error) {
            console.error("Error fetching events:", error);
            setAllEvents([]);
            setEvents([]);
        } finally {
            setIsFetching(false);
        }
    };

    // Update events when the visible range changes (guard against repeated identical ranges)
    const handleDatesSet = (info) => {
        const startStr = info.startStr || (info.start && dayjs(info.start).format('YYYY-MM-DD'));
        const endStr = info.endStr || (info.end && dayjs(info.end).format('YYYY-MM-DD'));
        
        // Create a unique key for this range and view
        const rangeKey = `${startStr}-${endStr}`;
        const currentRangeKey = visibleRange ? `${visibleRange.start}-${visibleRange.end}` : null;
        
        // Only skip if exact same range (but allow view changes)
        if (currentRangeKey === rangeKey && !isFetching) {
            console.log('Skipping identical range:', rangeKey);
            return;
        }
        
        console.log('Fetching new range:', rangeKey, 'from:', currentRangeKey);
        setVisibleRange({ start: startStr, end: endStr });
        refreshEvents(info.start, info.end);
    };

    const handleDateSelect = (info) => {
        setForm({
            employee_id: localStorage.getItem("employeeId") || "",
            service_id: "",
            client_name: "",
            client_phone: "",
            notes: "",
            start: info.startStr,
            end: info.endStr,
            final_price: "",
            final_duration_minutes: "",
        });
        setPayments([]);
        setNewPayment({});
        setOpen(true);
    };

    const handleServiceChange = (id) => {
        const s = services.find(x => x.id === Number(id));
        setForm({
            ...form,
            service_id: id,
            final_price: s?.base_price || "",
            final_duration_minutes: s?.base_duration_minutes || "",
        });
    };

    const handleSave = async () => {
        try {
            // Validar campos obligatorios
            if (!form.start || !form.end) {
                alert("Por favor, completa las fechas de inicio y fin.");
                return;
            }

            const payload = {
                employee_id: Number(form.employee_id),
                client: { full_name: form.client_name, phone: form.client_phone },
                service_id: Number(form.service_id),
                final_price: form.final_price,
                final_duration_minutes: form.final_duration_minutes,
                notes: form.notes,
                starts_at: form.start,
                ends_at: form.end,
            };

            let appointmentId;
            if (form.id) {
                // si existe id → editar turno
                await updateAppointment(form.id, payload);
                appointmentId = form.id;
            } else {
                // si no existe id → crear nuevo turno
                const response = await createAppointment(payload);
                appointmentId = response.data.id;
            }

            // Guardar pagos si hay alguno
            if (payments.length > 0) {
                await createPayments(appointmentId, payments);
            }

            setOpen(false);
            setPayments([]);
            setNewPayment({});
            refreshEvents();
        } catch (err) {
            console.error(err);
            alert("Error al guardar turno");
        }
    };
    const handleDelete = async () => {
        if (!form.id) return;
        if (!window.confirm("¿Seguro que querés eliminar este turno?")) return;
        try {
            await deleteAppointment(form.id);
            setOpen(false);
            refreshEvents();
        } catch (err) {
            console.error(err);
            alert("Error al eliminar turno");
        }
    };


    const handleEventChange = async (info) => {
        const event = info.event;
        const id = event.id;

        const newStart = dayjs(event.start).format("YYYY-MM-DDTHH:mm:ss");
        const newEnd = dayjs(event.end).format("YYYY-MM-DDTHH:mm:ss");

        // Calcular nueva duración en minutos
        const newDurationMinutes = dayjs(event.end).diff(dayjs(event.start), 'minute');

        try {
            await updateAppointment(id, {
                starts_at: newStart,
                ends_at: newEnd,
                final_duration_minutes: newDurationMinutes
            });
            console.log(`✅ Turno ${id} actualizado`);
            refreshEvents(); // Refrescar para asegurar consistencia
        } catch (err) {
            console.error("Error al mover turno:", err);
            info.revert(); // vuelve el evento a su lugar si falla
            alert("No se pudo actualizar el turno");
        }
    };

    const handleEventClick = async (info) => {
        const turno = info.event.extendedProps;
        setForm({
            id: turno.id,
            employee_id: turno.employee_id,
            service_id: turno.service_id,
            client_name: turno.client_name || "",
            client_phone: turno.client_phone || "",
            notes: turno.notes || "",
            start: dayjs(turno.starts_at).format("YYYY-MM-DDTHH:mm:ss"),
            end: dayjs(turno.ends_at).format("YYYY-MM-DDTHH:mm:ss"),
            final_price: turno.final_price,
            final_duration_minutes: turno.final_duration_minutes,
        });

        // Cargar pagos existentes
        try {
            const response = await getPayments(turno.id);
            setPayments(response.data || []);
        } catch (err) {
            console.error("Error al cargar pagos:", err);
            setPayments([]);
        }

        setOpen(true);
    };

    useEffect(() => {
        const handleEmployeeFilterChange = (event) => {
            const { employeeId } = event.detail;
            if (employeeId) {
                const filteredEvents = allEvents.filter(event => event.extendedProps.employee_id === Number(employeeId));
                setEvents(filteredEvents);
            } else {
                setEvents(allEvents);
            }
        };

        window.addEventListener("employeeFilterChange", handleEmployeeFilterChange);

        return () => {
            window.removeEventListener("employeeFilterChange", handleEmployeeFilterChange);
        };
    }, [allEvents]);

    return (
        <Box sx={{ position: "relative", p: 1 }}>
            <FullCalendar
                key="calendar-main" // Add stable key to prevent full re-renders
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                initialView="timeGridWeek"
                selectable
                selectMirror
                select={handleDateSelect}
                events={events}
                height="calc(100vh - 160px)"
                allDaySlot={false}
                slotMinTime="07:00:00"
                slotMaxTime="21:00:00"
                hiddenDays={[0]} // Hide Sundays
                eventDisplay="block"
                locale="es" // Set calendar locale to Spanish
                scrollTime="09:00:00" // Set default scroll position
                scrollTimeReset={false} // Prevent scroll reset on event changes
                eventMouseEnter={(info) => {
                    const el = info.el;
                    el.style.filter = "brightness(1.1)";
                    el.style.cursor = "pointer";
                }}
                eventMouseLeave={(info) => {
                    info.el.style.filter = "brightness(1)";
                }}
                eventContent={(eventInfo) => (
                    <div className="event-content">
                        <strong>{eventInfo.timeText}</strong> {eventInfo.event.title}
                    </div>
                )}
                eventDrop={handleEventChange}
                eventResize={handleEventChange}
                editable={true}
                eventResizableFromStart={true}
                eventStartEditable={true}
                eventDurationEditable={true}
                eventClick={handleEventClick}
                datesSet={handleDatesSet} // Trigger refresh on visible range change
            />

            {/* Botón flotante para nuevo turno */}
            <Tooltip title="Nuevo turno">
                <Fab
                    color="primary"
                    sx={{ position: "fixed", bottom: 24, right: 24, boxShadow: 4 }}
                    onClick={() => {
                        setForm({
                            employee_id: localStorage.getItem("employeeId") || "",
                            service_id: "",
                            client_name: "",
                            client_phone: "",
                            notes: "",
                            start: "",
                            end: "",
                            final_price: "",
                            final_duration_minutes: "",
                        });
                        setPayments([]);
                        setNewPayment({});
                        setOpen(true);
                    }}
                >
                    <AddIcon />
                </Fab>
            </Tooltip>

            {/* Modal */}
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        boxShadow: '0 24px 38px 3px rgba(0,0,0,0.14), 0 9px 46px 8px rgba(0,0,0,0.12), 0 11px 15px -7px rgba(0,0,0,0.2)',
                        overflow: 'visible'
                    }
                }}
            >
                <DialogTitle sx={{
                    fontWeight: 600,
                    fontSize: '1.4rem',
                    pb: 2,
                    pt: 3,
                    px: 4,
                    bgcolor: 'rgba(59, 130, 246, 0.08)',
                    color: 'grey.800',
                    textAlign: 'left',
                    borderBottom: '1px solid',
                    borderColor: 'rgba(59, 130, 246, 0.2)'
                }}>
                    {form.id ? '✏️ Editar Turno' : '➕ Nuevo Turno'}
                </DialogTitle>
                <DialogContent sx={{
                    mt: 3,
                    px: 4,
                    pb: 2,
                    bgcolor: 'rgba(248, 250, 252, 0.6)'
                }}>
                    <Grid container spacing={3}>
                        {/* Sección: Info Básica */}
                        <Grid item xs={12} sx={{
                            minWidth: '100%',
                            boxSizing: 'border-box',
                            display: 'flex'
                        }}>
                            <Box sx={{
                                p: 3,
                                bgcolor: 'rgba(59, 130, 246, 0.06)',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'rgba(59, 130, 246, 0.15)',
                                mb: 2,
                                width: '100%'
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(59, 130, 246, 0.1)',
                                        color: 'primary.main',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mr: 2,
                                        fontSize: '1.2rem'
                                    }}>
                                        👤
                                    </Box>
                                    <Box>
                                        <Box sx={{ fontWeight: 500, fontSize: '1rem', color: 'grey.700' }}>
                                            Información del Turno
                                        </Box>
                                        <Box sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
                                            Profesional, servicio y cliente
                                        </Box>
                                    </Box>
                                </Box>

                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <TextField
                                            select
                                            label="👩‍💼 Profesional"
                                            fullWidth
                                            variant="outlined"
                                            value={form.employee_id}
                                            onChange={e => setForm({ ...form, employee_id: e.target.value })}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                    bgcolor: 'white'
                                                }
                                            }}
                                            placeholder="Profesional"
                                        >
                                            {Array.isArray(employees) ? employees.map(e => (
                                                <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
                                            )) : []}
                                        </TextField>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <TextField
                                            select
                                            label="💅 Servicio"
                                            fullWidth
                                            variant="outlined"
                                            value={form.service_id}
                                            onChange={e => handleServiceChange(e.target.value)}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                    bgcolor: 'white'
                                                }
                                            }}
                                        >
                                            {Array.isArray(services) ? services.map(s => (
                                                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                                            )) : []}
                                        </TextField>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <TextField
                                            label="👥 Cliente"
                                            fullWidth
                                            variant="outlined"
                                            value={form.client_name}
                                            onChange={e => setForm({ ...form, client_name: e.target.value })}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                    bgcolor: 'white'
                                                }
                                            }}
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <TextField
                                            label="📱 Teléfono"
                                            fullWidth
                                            variant="outlined"
                                            value={form.client_phone}
                                            onChange={e => setForm({ ...form, client_phone: e.target.value })}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                    bgcolor: 'white'
                                                }
                                            }}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>
                        </Grid>

                        {/* Sección: Fecha y Hora */}
                        <Grid item xs={12} sx={{
                            minWidth: '100%',
                            boxSizing: 'border-box',
                            display: 'flex'
                        }}>
                            <Box sx={{
                                p: 3,
                                bgcolor: 'rgba(139, 92, 246, 0.06)',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'rgba(139, 92, 246, 0.15)',
                                mb: 2,
                                width: '100%'
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(139, 92, 246, 0.1)',
                                        color: 'secondary.main',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mr: 2,
                                        fontSize: '1.2rem'
                                    }}>
                                        🕐
                                    </Box>
                                    <Box>
                                        <Box sx={{ fontWeight: 500, fontSize: '1rem', color: 'grey.700' }}>
                                            Horario y Duración
                                        </Box>
                                        <Box sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
                                            Fecha, hora y detalles del servicio
                                        </Box>
                                    </Box>
                                </Box>

                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                            <DateTimePicker
                                                label="🕐 Inicio"
                                                value={form.start ? dayjs(form.start) : dayjs()}
                                                onChange={(newValue) =>
                                                    setForm({
                                                        ...form,
                                                        start: newValue.format("YYYY-MM-DDTHH:mm:ss"),
                                                        end: newValue.add(form.final_duration_minutes || 60, "minute").format("YYYY-MM-DDTHH:mm:ss")
                                                    })
                                                }
                                                slotProps={{
                                                    textField: {
                                                        fullWidth: true,
                                                        sx: {
                                                            '& .MuiOutlinedInput-root': {
                                                                borderRadius: 2,
                                                                bgcolor: 'white'
                                                            }
                                                        }
                                                    }
                                                }}
                                            />
                                        </LocalizationProvider>
                                    </Grid>

                                    <Grid item xs={12}>
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                            <DateTimePicker
                                                label="⏰ Fin"
                                                value={form.end ? dayjs(form.end) : dayjs().add(1, "hour")}
                                                onChange={(newValue) =>
                                                    setForm({
                                                        ...form,
                                                        end: newValue.format("YYYY-MM-DDTHH:mm:ss")
                                                    })
                                                }
                                                slotProps={{
                                                    textField: {
                                                        fullWidth: true,
                                                        sx: {
                                                            '& .MuiOutlinedInput-root': {
                                                                borderRadius: 2,
                                                                bgcolor: 'white'
                                                            }
                                                        }
                                                    }
                                                }}
                                            />
                                        </LocalizationProvider>
                                    </Grid>

                                    <Grid item xs={6}>
                                        <TextField
                                            label="💰 Precio"
                                            type="number"
                                            fullWidth
                                            variant="outlined"
                                            value={form.final_price}
                                            onChange={e => setForm({ ...form, final_price: e.target.value })}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                    bgcolor: 'white'
                                                }
                                            }}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField
                                            label="⏱️ Duración (min)"
                                            type="number"
                                            fullWidth
                                            variant="outlined"
                                            value={form.final_duration_minutes}
                                            onChange={e => setForm({ ...form, final_duration_minutes: e.target.value })}
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                    bgcolor: 'white'
                                                }
                                            }}
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <TextField
                                            label="📋 Notas"
                                            fullWidth
                                            variant="outlined"
                                            value={form.notes}
                                            onChange={e => setForm({ ...form, notes: e.target.value })}
                                            placeholder="Observaciones adicionales..."
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                    bgcolor: 'white'
                                                }
                                            }}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>
                        </Grid>

                        {/* Sección: Pagos */}
                        <Grid item xs={12} sx={{
                            minWidth: '100%',
                            boxSizing: 'border-box',
                            display: 'flex'
                        }}>
                            <Box sx={{
                                p: 3,
                                bgcolor: 'rgba(34, 197, 94, 0.06)',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'rgba(34, 197, 94, 0.15)',
                                width: '100%'
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                    <Box sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(34, 197, 94, 0.1)',
                                        color: 'success.main',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mr: 2,
                                        fontSize: '1.2rem'
                                    }}>
                                        💳
                                    </Box>
                                    <Box sx={{ flex: 1 }} className="formasdepago">
                                        <Box sx={{ fontWeight: 500, fontSize: '1rem', color: 'grey.700' }}>
                                            Formas de Pago
                                        </Box>
                                        <Box sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
                                            Registra los pagos recibidos
                                        </Box>
                                    </Box>
                                    {payments.length > 0 && (
                                        <Box sx={{
                                            bgcolor: 'success.main',
                                            color: 'white',
                                            px: 2,
                                            py: 0.5,
                                            borderRadius: 20,
                                            fontSize: '0.875rem',
                                            fontWeight: 600
                                        }}>
                                            Total: ${payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)}
                                        </Box>
                                    )}
                                </Box>

                                {/* Formulario para agregar pago */}
                                <Box sx={{
                                    display: "flex",
                                    gap: 2,
                                    mb: 2,
                                    p: 2,
                                    bgcolor: 'white',
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'rgba(226, 232, 240, 0.8)'
                                }}>
                                    <TextField
                                        select
                                        label="💰 Método"
                                        value={newPayment.method || ""}
                                        onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                                        sx={{
                                            minWidth: 160,
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2
                                            }
                                        }}
                                    >
                                        <MenuItem value="CASH">💵 Efectivo</MenuItem>
                                        <MenuItem value="TRANSFER">📱 Transferencia</MenuItem>
                                    </TextField>
                                    <TextField
                                        label="💲 Monto"
                                        type="number"
                                        value={newPayment.amount || ""}
                                        onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                                        sx={{
                                            minWidth: 120,
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2
                                            }
                                        }}
                                    />
                                    <Button
                                        variant="outlined"
                                        onClick={() => {
                                            if (!newPayment.method || !newPayment.amount) return;
                                            const currentPayments = Array.isArray(payments) ? payments : [];
                                            setPayments([...currentPayments, newPayment]);
                                            setNewPayment({});
                                        }}
                                        sx={{
                                            borderRadius: 2,
                                            minWidth: 100,
                                            fontWeight: 500,
                                            borderColor: 'success.main',
                                            color: 'success.main',
                                            '&:hover': {
                                                bgcolor: 'success.50',
                                                borderColor: 'success.main'
                                            }
                                        }}
                                    >
                                        ➕ Agregar
                                    </Button>
                                </Box>

                                {/* Lista de pagos */}
                                {payments.length > 0 && (
                                    <Box sx={{
                                        bgcolor: 'white',
                                        borderRadius: 2,
                                        p: 2,
                                        border: '1px solid',
                                        borderColor: 'success.200'
                                    }}>
                                        <Box sx={{ fontWeight: 600, mb: 2, color: 'grey.700' }}>
                                            📋 Pagos Registrados
                                        </Box>
                                        {Array.isArray(payments) ? payments.map((p, i) => (
                                            <Box key={i} sx={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                mb: 1.5,
                                                p: 2,
                                                bgcolor: "grey.50",
                                                borderRadius: 2,
                                                border: '1px solid',
                                                borderColor: 'grey.200',
                                                '&:hover': {
                                                    bgcolor: 'grey.100'
                                                }
                                            }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box sx={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: '50%',
                                                        bgcolor: 'success.100',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.875rem'
                                                    }}>
                                                        {p.method === 'CASH' ? '💵' : '📱'}
                                                    </Box>
                                                    <Box>
                                                        <Box sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                            {p.method === 'CASH' ? 'Efectivo' : 'Transferencia'}
                                                        </Box>
                                                    </Box>
                                                </Box>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                    <Box sx={{
                                                        fontWeight: 700,
                                                        fontSize: '1rem',
                                                        color: 'success.main'
                                                    }}>
                                                        ${p.amount}
                                                    </Box>
                                                    <Button
                                                        size="small"
                                                        color="error"
                                                        variant="outlined"
                                                        onClick={() => {
                                                            const currentPayments = Array.isArray(payments) ? payments : [];
                                                            setPayments(currentPayments.filter((_, index) => index !== i));
                                                        }}
                                                        sx={{
                                                            minWidth: 32,
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: '50%',
                                                            p: 0
                                                        }}
                                                    >
                                                        ✕
                                                    </Button>
                                                </Box>
                                            </Box>
                                        )) : []}
                                    </Box>
                                )}
                            </Box>
                        </Grid>

                    </Grid>
                </DialogContent>

                <DialogActions sx={{
                    px: 4,
                    py: 3,
                    bgcolor: 'grey.50',
                    borderTop: '1px solid',
                    borderColor: 'grey.200',
                    gap: 2
                }}>
                    {form.id && (
                        <Button
                            color="error"
                            variant="outlined"
                            onClick={handleDelete}
                            sx={{
                                mr: "auto",
                                borderRadius: 2,
                                px: 3,
                                py: 1,
                                fontWeight: 600,
                                borderWidth: 2,
                                '&:hover': {
                                    borderWidth: 2
                                }
                            }}
                            startIcon={<span>🗑️</span>}
                        >
                            Eliminar
                        </Button>
                    )}
                    <Button
                        onClick={() => setOpen(false)}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            py: 1,
                            fontWeight: 600,
                            color: 'grey.600'
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        sx={{
                            borderRadius: 2,
                            px: 4,
                            py: 1.2,
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            bgcolor: 'primary.main',
                            color: 'white',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            '&:hover': {
                                bgcolor: 'primary.dark',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                transform: 'translateY(-1px)'
                            },
                            transition: 'all 0.2s ease-in-out'
                        }}
                        startIcon={<span>{form.id ? '💾' : '➕'}</span>}
                    >
                        {form.id ? "Guardar cambios" : "Crear turno"}
                    </Button>
                </DialogActions>

            </Dialog>
        </Box>
    );
}
