import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedBuyerPassword = await bcrypt.hash('buyer123', 10);
  const hashedSellerPassword = await bcrypt.hash('seller123', 10);

  // Clear existing data in reverse dependency order
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.product.deleteMany();
  await prisma.sellerVerification.deleteMany();
  await prisma.seller.deleteMany();
  await prisma.buyer.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  // Create a buyer user
  const buyerUser = await prisma.user.create({
    data: {
      email: 'buyer1@example.com',
      password: hashedBuyerPassword,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      role: 'buyer',
      buyer: {
        create: {
          preferredName: 'John',
        },
      },
    },
  });

  // Create a seller user
  const sellerUser = await prisma.user.create({
    data: {
      email: 'seller1@example.com',
      password: hashedSellerPassword,
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+0987654321',
      role: 'seller',
    },
  });

  const sellerProfile = await prisma.seller.create({
    data: {
      userId: sellerUser.id,
      storeName: 'Tech Store',
      storeDescription: 'Premium electronics and gadgets',
      businessType: 'business',
      isActive: true,
      sellerVerification: {
        create: {
          status: 'approved',
          reviewedAt: new Date(),
        },
      },
    },
  });

  const product1 = await prisma.product.create({
    data: {
      sellerId: sellerProfile.id,
      name: 'Wireless Headphones',
      description: 'High-quality wireless headphones with noise cancellation',
      price: 99.99,
      category: 'electronics',
      subcategory: 'Audio',
      stock: 50,
      image: '/images/headphones.jpg',
      images: ['/images/headphones-1.jpg', '/images/headphones-2.jpg'],
    },
  });

  const product2 = await prisma.product.create({
    data: {
      sellerId: sellerProfile.id,
      name: 'USB-C Cable',
      description: 'Durable USB-C charging cable',
      price: 15.99,
      category: 'electronics',
      subcategory: 'Cables',
      stock: 200,
      image: '/images/usb-c.jpg',
    },
  });

  await prisma.cart.create({
    data: {
      userId: buyerUser.id,
      items: {
        create: [
          {
            productId: product1.id,
            quantity: 1,
          },
          {
            productId: product2.id,
            quantity: 2,
          },
        ],
      },
    },
  });

  // Create address first
  const address = await prisma.address.create({
    data: {
      userId: buyerUser.id,
      label: 'Home',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      isDefault: true,
    },
  });

  // Create order with address reference
  const order = await prisma.order.create({
    data: {
      buyerId: buyerUser.id,
      sellerId: sellerProfile.id,
      orderNumber: `ORD-${Date.now()}`,
      status: 'pending',
      totalAmount: 131.97,
      addressId: address.id,
      items: {
        create: [
          {
            productId: product1.id,
            quantity: 1,
            price: 99.99,
          },
          {
            productId: product2.id,
            quantity: 2,
            price: 15.99,
          },
        ],
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: buyerUser.id,
      orderId: order.id,
      type: 'order_confirmed',
      title: 'Order Confirmed',
      message: 'Your order has been confirmed and will be shipped soon.',
    },
  });

  console.log('Seed completed successfully!');
  console.log('Buyer email: buyer1@example.com');
  console.log('Seller email: seller1@example.com');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
