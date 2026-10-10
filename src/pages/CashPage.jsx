import { useState, useEffect } from "react";
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, TextField, Button, Stack } from "@mui/material";
import { getCashRange } from "../api/cash";
import dayjs from "dayjs";

const fmt = (n) => `$${n.toFixed(2)}`;

export default function CashPage() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [from, setFrom] = useState(dayjs().format("YYYY-MM-DD"));
    const [to, setTo] = useState(dayjs().format("YYYY-MM-DD"));

    const invalidRange = !from || !to || from > to;

    useEffect(() => {
        if (!from || !to || from > to) return;
        setError(null);
        getCashRange(from, to)
            .then(res => setData(res.data))
            .catch(() => setError("No se pudo cargar la caja"));
    }, [from, to]);

    const setPreset = (start, end) => {
        setFrom(start.format("YYYY-MM-DD"));
        setTo(end.format("YYYY-MM-DD"));
    };

    const rows = Object.entries(data?.agrupado_por_empleada || {}).map(([employee, methods]) => {
        const efectivo = methods['CASH'] || 0;
        const transferencia = methods['TRANSFER'] || 0;
        const total = efectivo + transferencia;
        return { employee, efectivo, transferencia, total, meta: total * 0.5 };
    });

    const totals = rows.reduce(
        (acc, r) => ({
            efectivo: acc.efectivo + r.efectivo,
            transferencia: acc.transferencia + r.transferencia,
            total: acc.total + r.total,
            meta: acc.meta + r.meta,
        }),
        { efectivo: 0, transferencia: 0, total: 0, meta: 0 }
    );

    const title = from === to
        ? `Caja del ${dayjs(from).format("DD/MM/YYYY")}`
        : `Caja del ${dayjs(from).format("DD/MM/YYYY")} al ${dayjs(to).format("DD/MM/YYYY")}`;

    return (
        <Box p={2}>
            <Typography variant="h6">💰 {title}</Typography>

            {/* Period selector */}
            <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap", rowGap: 1 }} alignItems="center">
                <TextField
                    label="Desde"
                    type="date"
                    size="small"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    label="Hasta"
                    type="date"
                    size="small"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    error={invalidRange}
                    helperText={invalidRange ? "Rango inválido" : ""}
                />
                <Button size="small" onClick={() => setPreset(dayjs(), dayjs())}>Hoy</Button>
                <Button size="small" onClick={() => setPreset(dayjs().subtract(1, "day"), dayjs().subtract(1, "day"))}>Ayer</Button>
                <Button size="small" onClick={() => setPreset(dayjs().startOf("week"), dayjs().endOf("week"))}>Esta semana</Button>
                <Button size="small" onClick={() => setPreset(dayjs().startOf("month"), dayjs().endOf("month"))}>Este mes</Button>
                <Button size="small" onClick={() => setPreset(dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month"))}>Mes anterior</Button>
            </Stack>

            {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
            {!data && !error && !invalidRange && <Typography sx={{ mt: 2 }}>Cargando...</Typography>}

            {data && !invalidRange && (
                <>
                    {/* Breakdown by payment method per professional */}
                    <Typography variant="subtitle2" sx={{ mt: 4 }}>Detalle efectivo / transferencia por profesional:</Typography>
                    <Table size="small" sx={{ mt: 1, mb: 2 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Profesional</TableCell>
                                <TableCell align="right">Efectivo</TableCell>
                                <TableCell align="right">Transferencia</TableCell>
                                <TableCell align="right">Total</TableCell>
                                <TableCell align="right">50% (meta)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((r) => (
                                <TableRow key={r.employee}>
                                    <TableCell>{r.employee}</TableCell>
                                    <TableCell align="right">{fmt(r.efectivo)}</TableCell>
                                    <TableCell align="right">{fmt(r.transferencia)}</TableCell>
                                    <TableCell align="right">{fmt(r.total)}</TableCell>
                                    <TableCell align="right">{fmt(r.meta)}</TableCell>
                                </TableRow>
                            ))}
                            {rows.length > 0 && (
                                <TableRow>
                                    <TableCell sx={{ fontWeight: "bold" }}>Total</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: "bold" }}>{fmt(totals.efectivo)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: "bold" }}>{fmt(totals.transferencia)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: "bold" }}>{fmt(totals.total)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: "bold" }}>{fmt(totals.meta)}</TableCell>
                                </TableRow>
                            )}
                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">Sin movimientos en este período</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {/* Cash handling logic summary per professional */}
                    <Box>
                        {rows.map(({ employee, efectivo, meta }) => {
                            const message = efectivo >= meta
                                ? `✔ ${employee}: Puede llevarse ${fmt(meta)} en efectivo. Dejar ${fmt(efectivo - meta)} en caja.`
                                : `⚠️ ${employee}: Efectivo insuficiente. Pedir transferencia de ${fmt(meta - efectivo)} a Brunella.`;
                            return (
                                <Typography key={employee} variant="body2" sx={{ mb: 0.5 }}>
                                    {message}
                                </Typography>
                            );
                        })}
                    </Box>
                </>
            )}
        </Box>
    );
}
