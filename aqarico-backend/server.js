import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { globalLimiter, authLimiter } from './config/rateLimit.js';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import path from 'path';

// Route imports
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import propertyRoutes from './routes/properties.js';
import agentRoutes from './routes/agents.js';
import favoriteRoutes from './routes/favorites.js';
import bookingRoutes from './routes/bookings.js';
import predictRoutes from './routes/predict.js';
import analyticsRoutes from './routes/analytics.js';
import chatRoutes from './routes/chat.js';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Trust proxy for services like Vercel/Heroku/Cloudflare
app.set('trust proxy', 1);

// Security Headers
app.use(helmet());

// CORS — allow Vite dev server and common local origins
app.use(cors({
  origin: true, // This allows dynamic origins (like your future Vercel domain)
  credentials: true,
}));

// Body parsing — tighten default limits for API safety
// (Multer handles property uploads separately with specific limits)
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Apply global rate limiter to all API routes
app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);

// Logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/predict', predictRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Aqarico API is running 🏠' });
});

const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1y',
  immutable: true,
  fallthrough: true
}));
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Aqarico Backend is healthy and running! 🚀' });
});

// Global error handler — must be after routes
app.use(errorHandler);

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`🚀 Aqarico Backend running on port ${PORT}`);
});

export default app;
