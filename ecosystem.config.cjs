module.exports = {
  apps: [
    {
      name: 'vxpanel',
      script: 'dist/server.cjs',
      env: {
        NODE_ENV: 'production',
      }
    }
  ]
};
