import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import apiRoutes from './routes/index.js';
import { openapiSpec } from './docs/openapi.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { NotFoundError } from './errors/AppError.js';
import { ENV } from './config/env.js';

const app = express();

// Standard middlewares
app.use(
  cors({
    origin: [ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// OpenAPI Swagger UI Documentation
app.get('/api/docs/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openapiSpec);
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  customSiteTitle: 'Cinema Booking API Documentation',
}));

// API Routes
app.use('/api', apiRoutes);

// 404 Handler for undefined routes
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
});

// Central error handler
app.use(errorHandler);

export default app;
