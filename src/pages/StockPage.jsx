import { Box, Typography } from "@mui/material";

export default function StockPage() {
    return (
        <Box p={2}>
            <Typography variant="h6">📦 Control de Stock</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
                Próximamente: listado de insumos y retiros por profesional.
            </Typography>
        </Box>
    );
}
