import { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState("cargando...");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("sin conexión"));
  }, []);

  return <p>API: {status}</p>;
}