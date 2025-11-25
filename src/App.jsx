import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CssBaseline, Box } from "@mui/material";
import TopBar from "./components/TopBar";
import CalendarPage from "./pages/CalendarPage";
import StockPage from "./pages/StockPage";
import CashPage from "./pages/CashPage";
import ServicesPage from "./pages/ServicesPage";

function App() {
  return (
    <BrowserRouter>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
        <TopBar />
        <Box sx={{ flexGrow: 1, overflow: "auto" }}>
          <Routes>
            <Route path="/" element={<CalendarPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/caja" element={<CashPage />} />
            <Route path="/servicios" element={<ServicesPage />} />
          </Routes>
        </Box>
      </Box>
    </BrowserRouter>
  );
}

export default App;
