import app from './app.js';
import { ENV } from './config/env.js';
import { startHoldCleanupJob, stopHoldCleanupJob } from './utils/cleanupJob.js';

// Start hold cleanup background job
startHoldCleanupJob(60000);

const server = app.listen(ENV.PORT, () => {
  console.log(`Cinema Booking Server running on port ${ENV.PORT} [${ENV.NODE_ENV}]`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  stopHoldCleanupJob();
  server.close(() => {
    console.log('Server process terminated');
  });
});
