const cleanUrl = (value?: string) => {
  if (!value) return '';
  return value.trim().replace(/\/+$/, '');
};

export const integrationConfig = {
  vorkApiBaseUrl: cleanUrl(import.meta.env.VITE_VORKAI_API_URL) || 'http://127.0.0.1:8000',
  aqiDashboardUrl:
    cleanUrl(import.meta.env.VITE_AQI_DASHBOARD_URL) || 'http://127.0.0.1:8501',
  aqiFeedUrl: cleanUrl(import.meta.env.VITE_AQI_FEED_URL),
};

