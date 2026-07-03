import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.routes';
import verificationRoutes from './routes/verification.routes';
import cartRoutes from './routes/cart.routes';
import userRoutes from './routes/user.routes';
import notificationRoutes from './routes/notification.routes';
import dashboardRoutes from './routes/dashboard.routes';
import sellerAuthRoutes from './routes/seller-auth.routes';
import sellerDashboardRoutes from './routes/seller-dashboard.routes';
import productRoutes from './routes/product.routes';
import publicSellerRoutes from './routes/public-seller.routes';
import wishlistRoutes from './routes/wishlist.routes';
import followRoutes from './routes/follow.routes';
import adminRoutes from './routes/admin.routes';
import orderRoutes from './routes/order.routes';
import refundRoutes from './routes/refund.routes';
import { errorHandler } from './middleware/errorHandler';
import { initializeEmailService } from './services/email.service';
import { initializeR2 } from './services/r2.service';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// ── Process-level handlers ──
process.on('unhandledRejection', (err: any) => {
  console.error('❌ Unhandled Rejection:', err);
});
process.on('uncaughtException', (err: Error) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// ── Middleware ──
const isDev = process.env.NODE_ENV === 'development';
const allowedOrigins = isDev
  ? ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://localhost:5500', 'http://localhost:8080', 'http://localhost:5000', 'http://127.0.0.1:5000']
  : [process.env.FRONTEND_URL || ''].filter(Boolean);
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
const backendOrigin = process.env.BACKEND_URL || 'http://localhost:5000';
const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src':    ["'self'", 'data:', backendOrigin, '*.supabase.co'],
      'connect-src': ["'self'", backendOrigin, frontendOrigin],
      'upgrade-insecure-requests': [],
    },
  },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Health checks ──
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', message: 'UnimartX Backend is running' });
});

app.get('/api/health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'OK', message: 'Database connection successful' });
  } catch {
    res.status(500).json({ status: 'ERROR', message: 'Database connection failed' });
  }
});

app.post('/api/test', express.json(), (req, res) => {
  res.json({ received: req.body });
});

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/auth', verificationRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/buyer', dashboardRoutes);
app.use('/api/seller-auth', sellerAuthRoutes);
app.use('/api/seller', sellerDashboardRoutes);
app.use('/api/seller', productRoutes);
app.use('/api/public', publicSellerRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/orders', orderRoutes);


// ── Error handler (must be last) ──
app.use(errorHandler);

// ── Graceful shutdown ──
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// ── Init R2 storage ──
initializeR2();

// ── Init email service (non-critical — silent failure is OK) ──
initializeEmailService().catch((error) => {
  console.error('Failed to initialize email service:', error);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Prisma Studio: run "npm run prisma:studio" to view the database`);
});
