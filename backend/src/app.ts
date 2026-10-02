// Importa Express, el framework que maneja las rutas y peticiones HTTP
import express from "express";
// Importa CORS, el middleware que permite que otro origen (el frontend) llame a esta API
import cors from "cors";

// Crea la aplicación de Express y la exporta para usarla en server.ts y en las pruebas
export const app = express();

// Permite peticiones solo desde el frontend de Vite (puerto 5173); el resto de orígenes se bloquea
app.use(cors({ origin: "http://localhost:5173" }));

app.use(express.json());

// Define una ruta GET en /health; _req lleva guion bajo porque no la usamos
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});
