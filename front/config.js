const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

window.APP_CONFIG = {
  API_BASE_URL: isLocalHost
    ? 'http://127.0.0.1:3000'
    : 'https://ba-web-comisiones.onrender.com'
};
