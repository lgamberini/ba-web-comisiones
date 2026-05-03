/**
 * Configuración de la aplicación
 * Detecta el entorno de ejecución (local o producción) y configura las URLs correspondientes
 */

const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

window.APP_CONFIG = {
  // URL base del API - localhost en desarrollo, Render en producción
  API_BASE_URL: isLocalHost
    ? 'http://127.0.0.1:3000'
    : 'https://ba-web-comisiones.onrender.com',
  // Client ID de Google Sign-In para autenticación con Google
  GOOGLE_CLIENT_ID: '138211155805-5b0vq5b6h86n99oaovbpipbt2fq4jras.apps.googleusercontent.com'
};
