# UnimartX Backend

A Node.js backend for UnimartX marketplace using PostgreSQL and Prisma.

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Web Framework**: Express.js

## Setup Instructions

### Prerequisites

1. **Node.js 20+** (Current version may cause issues with latest Prisma)

   ```bash
   # Check your Node version
   node --version

   # If you need to upgrade Node.js, consider using nvm:
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 20
   nvm use 20
   ```

2. **PostgreSQL** - You have two options:

   **Option A: Docker (Recommended)**

   ```bash
   # Install Docker if not already installed
   sudo apt install docker.io

   # Start PostgreSQL
   cd backend
   docker-compose up -d
   ```

   **Option B: Local PostgreSQL**

   ```bash
   sudo apt install postgresql postgresql-contrib

   # Create database and user
   sudo -u postgres psql
   CREATE USER unimart_user WITH PASSWORD 'unimart_password';
   CREATE DATABASE unimart_db OWNER unimart_user;
   \q
   ```

### Installation

1. **Install dependencies**

   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your database URL if needed
   ```

3. **Generate Prisma client**

   ```bash
   npx prisma generate
   ```

4. **Run database migrations**

   ```bash
   npx prisma migrate dev --name init
   ```

5. **Seed the database (optional)**
   ```bash
   npm run prisma:seed
   ```

### Running the Application

**Development mode:**

```bash
npm run dev
```

**Production build:**

```bash
npm run build
npm start
```

### Database Management

**View database in Prisma Studio:**

```bash
npm run prisma:studio
```

**Reset database:**

```bash
npx prisma migrate reset
```

**Create new migration:**

```bash
npx prisma migrate dev --name your_migration_name
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/health/db` - Database connection check
- `GET /api/users` - Get all users (example endpoint)

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Express middleware
│   ├── models/          # (Optional - Prisma handles models)
│   └── routes/          # API routes
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.ts         # Database seeding
├── .env                # Environment variables
├── .env.example        # Environment template
├── docker-compose.yml  # Docker setup
├── package.json        # Dependencies
└── tsconfig.json       # TypeScript config
```

## Database Schema

The application uses the following main entities:

- **Users** - Buyers and sellers
- **Products** - Items for sale
- **Orders** - Purchase transactions
- **Reviews** - Product feedback
- **Wishlists** - Saved items
- **Notifications** - System messages
- **Addresses** - Shipping locations
- **SellerVerification** - Seller approval process

## Next Steps

1. Set up authentication (JWT)
2. Implement user registration/login
3. Add product CRUD operations
4. Implement order management
5. Add file upload for images
6. Set up email notifications

## Troubleshooting

**Node version issues:**

- Upgrade to Node.js 20+ for full Prisma compatibility

**Database connection errors:**

- Ensure PostgreSQL is running
- Check DATABASE_URL in .env file
- Verify database credentials

**Prisma issues:**

- Run `npx prisma generate` after schema changes
- Use `npx prisma studio` to inspect database

**Port conflicts:**

- Change PORT in .env if 5000 is in use
