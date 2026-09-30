import { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState("cargando...");

  // Arreglo de dependencias vacío: el chequeo se hace una sola vez, al montar el componente
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      // Si el backend está apagado o hay un fallo de red, fetch rechaza la promesa y caemos aquí
      .catch(() => setStatus("sin conexión"));
  }, []);

  return <p>API: {status}</p>;
}