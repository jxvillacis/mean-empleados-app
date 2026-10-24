// Producción: la API corre en AWS EC2 (Nginx + PM2) y el frontend en Azure App Service.
export const environment = {
  production: true,
  apiUrl: 'https://34-239-85-180.sslip.io/api/v1'
};
