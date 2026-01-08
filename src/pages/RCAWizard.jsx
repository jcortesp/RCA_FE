// src/pages/RCAWizard.jsx
import { useState } from "react";
import axiosClient from "../api/axiosClient";
import JourneyGraph from "../components/JourneyGraph";
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
} from "@mui/material";

export default function RCAWizard() {
  const [chainInput, setChainInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    setError("");
    setRoutes([]);

    const q = chainInput.trim();
    if (!q) {
      setError("Ingrese el servicio o flujo a buscar.");
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await axiosClient.post("/rca/backtrace", { search: q });
      const r = Array.isArray(data?.routes) ? data.routes : [];
      setRoutes(r);
      if (r.length === 0) setError("No se encontraron rutas padres ni transactions.");
    } catch {
      setError("Error en la búsqueda de rutas. Revisa la conexión.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, minHeight: "100vh" }}>
      <Typography variant="h5" fontWeight={600} gutterBottom align="left">
        RCA Wizard (Sterling OMS)
      </Typography>

      <Paper
        variant="outlined"
        sx={{
          p: 3,
          borderRadius: 2,
          borderColor: "rgba(25, 118, 210, 0.25)",
          background: "rgba(255,255,255,0.9)",
        }}
      >
        <Typography variant="subtitle1" gutterBottom align="center">
          Escribe el servicio o flujo para hacer el backtrace.
        </Typography>

        <Stack spacing={2}>
          <TextField
            size="small"
            label="Servicio o flujo"
            placeholder="adidasLAM_CNCCancelEmail"
            value={chainInput}
            onChange={(e) => setChainInput(e.target.value)}
            fullWidth
          />

          <Box>
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={18} /> : null}
            >
              {isLoading ? "Buscando…" : "Buscar rutas padres"}
            </Button>
          </Box>

          {error && <Alert severity="warning">{error}</Alert>}

          {!!routes.length && (
            <Box mt={1}>
              <Typography variant="subtitle2" gutterBottom align="left">
                Rutas encontradas (journey visual)
              </Typography>
              <JourneyGraph routes={routes} />
            </Box>
          )}
        </Stack>
      </Paper>
    </Container>
  );
}
