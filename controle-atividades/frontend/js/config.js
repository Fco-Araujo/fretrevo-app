const isAmbienteLocal =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost" ||
  window.location.hostname.includes("github.dev");

export const API_BASE_URL = isAmbienteLocal
  ? "https://supreme-space-carnival-jj7j7wjw5r54cq769-3000.app.github.dev"
  : "https://fretrevo-api.onrender.com";