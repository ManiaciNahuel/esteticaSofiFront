import { useState, useEffect } from "react";
import { AppBar, Toolbar, Typography, Box, Select, MenuItem, Tabs, Tab } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { getEmployees } from "../api/employees";
import dayjs from "dayjs";

const tabs = [
    { label: "Turnos", path: "/" },
    { label: "Stock", path: "/stock" },
    { label: "Caja", path: "/caja" },
];

export default function TopBar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [employees, setEmployees] = useState([]);
    const [selected, setSelected] = useState(localStorage.getItem("employeeId") || "");
    const [tabIndex, setTabIndex] = useState(tabs.findIndex(t => t.path === location.pathname));
    const [today, setToday] = useState(dayjs().format("YYYY-MM-DD"));

    useEffect(() => {
        getEmployees().then(res => setEmployees(res.data));
    }, []);

    const handleEmployeeChange = (e) => {
        setSelected(e.target.value);
        localStorage.setItem("employeeId", e.target.value);
    };

    const handleTabChange = (_, newIndex) => {
        setTabIndex(newIndex);
        navigate(tabs[newIndex].path);
    };

    return (
        <AppBar position="static" color="default" elevation={1}>
            <Toolbar sx={{ flexWrap: "wrap", justifyContent: "space-between" }}>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>💅 Maniaci</Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Select
                        size="small"
                        value={selected}
                        onChange={handleEmployeeChange}
                        displayEmpty
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value=""><em>Seleccionar profesional</em></MenuItem>
                        {employees.map(e => (
                            <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>
                        ))}
                    </Select>

                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {dayjs(today).format("DD/MM/YYYY")}
                    </Typography>
                </Box>
            </Toolbar>

            <Tabs value={tabIndex} onChange={handleTabChange} centered>
                {tabs.map((tab, i) => (
                    <Tab key={i} label={tab.label} />
                ))}
            </Tabs>
        </AppBar>
    );
}
