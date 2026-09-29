// EXPO_BASE_URL sert au déploiement sur GitHub Pages (ex. "/multi-level-progress-app").
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...(config.experiments ?? {}), ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
});
