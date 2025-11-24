import { useState, useEffect } from "react";
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import { getCashDaily } from "../api/cash";
import dayjs from "dayjs";

export default function CashPage() {
    const [data, setData] = useState(null);
    const today = dayjs().format("YYYY-MM-DD");

    useEffect(() => {
        getCashDaily(today).then(res => setData(res.data));
    }, []);

    if (!data) return <Typography p={2}>Cargando...</Typography>;

    return (
        <Box p={2}>
            <Typography variant="h6">💰 Caja diaria ({dayjs(today).format("DD/MM/YYYY")})</Typography>

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
                    {Object.entries(data.agrupado_por_empleada || {}).map(([employee, methods]) => {
                        const efectivo = methods['CASH'] || 0;
                        const transferencia = methods['TRANSFER'] || 0;
                        const total = efectivo + transferencia;
                        const meta = (total * 0.5).toFixed(2);
                        return (
                            <TableRow key={employee}>
                                <TableCell>{employee}</TableCell>
                                <TableCell align="right">${efectivo.toFixed(2)}</TableCell>
                                <TableCell align="right">${transferencia.toFixed(2)}</TableCell>
                                <TableCell align="right">${total.toFixed(2)}</TableCell>
                                <TableCell align="right">${meta}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            {/* Cash handling logic summary per professional */}
            <Box>
                {Object.entries(data.agrupado_por_empleada || {}).map(([employee, methods]) => {
                    const efectivo = methods['CASH'] || 0;
                    const transferencia = methods['TRANSFER'] || 0;
                    const total = efectivo + transferencia;
                    const meta = total * 0.5;
                    let message = '';
                    if (efectivo >= meta) {
                        const sobrante = efectivo - meta;
                        message = `✔ ${employee}: Puede llevarse $${meta.toFixed(2)} en efectivo. Dejar $${sobrante.toFixed(2)} en caja.`;
                    } else {
                        const faltante = meta - efectivo;
                        message = `⚠️ ${employee}: Efectivo insuficiente. Pedir transferencia de $${faltante.toFixed(2)} a la dueña.`;
                    }
                    return (
                        <Typography key={employee} variant="body2" sx={{ mb: 0.5 }}>
                            {message}
                        </Typography>
                    );
                })}
            </Box>
        </Box>
    );
}
