import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import RCAWizard from "./pages/RCAWizard";

/**
 * Tema MUI:
 * - Estética limpia y consistente con el canvas azul de ReactFlow.
 * - No cambia funcionalidad, solo estilos.
 */
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1976D2" },   // Azul fuerte (igual al flow)
    secondary: { main: "#43A047" }, // Verde (service)
    background: {
      default: "#F6F9FF",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#0B1F33",
      secondary: "#3A4A5A",
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: [
      "Inter",
      "system-ui",
      "-apple-system",
      "Segoe UI",
      "Roboto",
      "Arial",
      "sans-serif",
    ].join(","),
    h5: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiPaper: {
      styleOverrides: { root: { borderRadius: 14 } },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, paddingLeft: 16, paddingRight: 16 },
      },
    },
    MuiTextField: { defaultProps: { variant: "outlined" } },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RCAWizard />} />
          <Route path="/rca-wizard" element={<RCAWizard />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
