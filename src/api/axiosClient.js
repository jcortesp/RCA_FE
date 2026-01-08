import axios from "axios";

/**
 * Cliente Axios
 *
 * Para funcional:
 * - Define el "backend destino" para este FE.
 *
 * Para dev:
 * - baseURL apunta al backend local (Spring Boot) en 8080
 */
const axiosClient = axios.create({
  baseURL: "http://localhost:8080/api",
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

export default axiosClient;
