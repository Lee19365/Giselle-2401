import { app } from "./app";

// Toma el puerto de la variable de entorno PORT; si no existe, usa 3001
const PORT = Number(process.env.PORT) || 3001;

// Arranca el servidor escuchando en ese puerto y avisa por consola cuando está listo
app.listen(PORT, () => console.log(`API en http://localhost:${PORT}`));
