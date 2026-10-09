require('dotenv').config();
const app = require('./app');
const connectDB = require('./src/config/db');
const { preloadRolePermissions } = require('./src/services/roleService');

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await preloadRolePermissions();

  const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`API Base URL: http://localhost:${PORT}/api`);
  });

  // handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });

  process.on('SIGTERM', () => {
    console.log(' SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('✅ Process terminated');
    });
  });
}).catch((error) => {
  console.error(`❌ Server startup failed: ${error.message}`);
  process.exit(1);
});
