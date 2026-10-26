import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const IS_PROD = process.env.NODE_ENV === 'production';

async function main() {
  console.log('Seeding database... (NODE_ENV=' + process.env.NODE_ENV + ')');

  if (!IS_PROD) {
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
  }

  if (IS_PROD) {
    const catCount = await prisma.category.count();
    if (catCount > 0) {
      console.log('Production: categories already seeded (' + catCount + ' rows). Skipping full seed.');
      return;
    }
  }

  if (!IS_PROD) {
    const hashedBuyerPassword = await bcrypt.hash('buyer123', 10);
    const hashedSellerPassword = await bcrypt.hash('seller123', 10);
    // Development-only Control Center credentials. These use the standard
    // authentication flow and are never created when NODE_ENV=production.
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@unimartx.test',
        password: hashedAdminPassword,
        firstName: 'Amina',
        lastName: 'Mensah',
        role: 'admin',
        emailVerified: true,
      },
    });

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

    // Extra marketplace fixtures make the Control Center queue, totals, and
    // management tables useful to assess without fabricating UI-only values.
    const pendingSellerUser = await prisma.user.create({
      data: {
        email: 'kwame@campus.test', password: hashedSellerPassword,
        firstName: 'Kwame', lastName: 'Asante', phone: '+233200000001',
        role: 'seller', emailVerified: true,
      },
    });
    const pendingSeller = await prisma.seller.create({
      data: {
        userId: pendingSellerUser.id, storeName: 'Kwame\'s Tech Corner',
        storeDescription: 'Refurbished devices and student essentials.',
        businessType: 'student-business', campus: 'Legon Campus', city: 'Accra',
        category: 'Tech & Gadgets', isActive: false,
        sellerVerification: { create: { status: 'pending', studentEmail: 'kwame@st.ug.edu.gh', verificationMethod: 'student_email' } },
      },
    });
    const pendingSellerTwoUser = await prisma.user.create({
      data: {
        email: 'efua@campus.test', password: hashedSellerPassword,
        firstName: 'Efua', lastName: 'Owusu', phone: '+233200000002',
        role: 'seller', emailVerified: true,
      },
    });
    const pendingSellerTwo = await prisma.seller.create({
      data: {
        userId: pendingSellerTwoUser.id, storeName: 'Efua Made It',
        storeDescription: 'Handmade campus gifts and accessories.',
        businessType: 'student-business', campus: 'KNUST', city: 'Kumasi',
        category: 'Fashion & Accessories', isActive: false,
        sellerVerification: { create: { status: 'pending', studentEmail: 'efua@st.knust.edu.gh', verificationMethod: 'student_email' } },
      },
    });
    const approvedSellerUser = await prisma.user.create({
      data: {
        email: 'nana@campus.test', password: hashedSellerPassword,
        firstName: 'Nana', lastName: 'Boateng', phone: '+233200000003',
        role: 'seller', emailVerified: true,
      },
    });
    const approvedSeller = await prisma.seller.create({
      data: {
        userId: approvedSellerUser.id, storeName: 'Campus Cravings',
        storeDescription: 'Fresh snacks and drinks delivered around campus.',
        businessType: 'student-business', campus: 'Legon Campus', city: 'Accra',
        category: 'Food & Drinks', isActive: true,
        sellerVerification: { create: { status: 'approved', reviewedAt: new Date(), verificationMethod: 'student_id' } },
      },
    });

    const product1 = await prisma.product.create({
      data: {
        sellerId: sellerProfile.id,
        name: 'Wireless Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        price: 99.99,
        category: 'tech-gadgets',
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
        category: 'tech-gadgets',
        subcategory: 'Accessories',
        stock: 200,
        image: '/images/usb-c.jpg',
      },
    });
    const product3 = await prisma.product.create({
      data: { sellerId: approvedSeller.id, name: 'Study Snack Box', description: 'A selection of treats for late study sessions.', price: 24.5, category: 'food-drinks', subcategory: 'Snacks', stock: 4, image: '/images/snack-box.jpg' },
    });
    await prisma.product.create({
      data: { sellerId: pendingSeller.id, name: 'Used Graphing Calculator', description: 'Reliable calculator in good condition.', price: 85, category: 'tech-gadgets', subcategory: 'Accessories', stock: 2, image: '/images/calculator.jpg', isActive: false },
    });
    await prisma.product.create({
      data: { sellerId: pendingSellerTwo.id, name: 'Campus Tote Bag', description: 'Handmade cotton tote bag.', price: 45, category: 'fashion-accessories', subcategory: 'Bags', stock: 18, image: '/images/tote.jpg', isActive: false },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    await prisma.promotion.createMany({
      data: [
        {
          sellerId: sellerProfile.id,
          name: 'Weekend Special',
          description: '20% off selected tech items this weekend only.',
          type: 'percentage',
          value: 20,
          target: 'selected',
          productIds: [product1.id],
          startDate: startOfMonth,
          endDate: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), 7),
          status: 'active',
          ordersCount: 12,
          revenue: 540,
        },
        {
          sellerId: sellerProfile.id,
          name: 'Back to School',
          description: 'Flat ₵10 off everything in the store.',
          type: 'fixed',
          value: 10,
          target: 'store',
          productIds: [],
          startDate: startOfMonth,
          endDate: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0),
          status: 'active',
          ordersCount: 9,
          revenue: 380,
        },
        {
          sellerId: sellerProfile.id,
          name: 'Summer Sale',
          description: 'End-of-summer discount on audio gear.',
          type: 'percentage',
          value: 15,
          target: 'store',
          productIds: [],
          startDate: twoMonthsAgo,
          endDate: new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth() + 1, 7),
          status: 'ended',
          ordersCount: 6,
          revenue: 320,
        },
        {
          sellerId: sellerProfile.id,
          name: 'Flash Deal',
          description: 'One-day flash discount on cables.',
          type: 'percentage',
          value: 25,
          target: 'selected',
          productIds: [product2.id],
          startDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          status: 'scheduled',
          ordersCount: 0,
          revenue: 0,
        },
        {
          sellerId: sellerProfile.id,
          name: 'Holiday Draft',
          description: 'Not ready to launch yet.',
          type: 'percentage',
          value: 10,
          target: 'store',
          productIds: [],
          startDate: new Date(now.getFullYear(), 11, 1),
          endDate: new Date(now.getFullYear(), 11, 31),
          status: 'draft',
          ordersCount: 0,
          revenue: 0,
        },
      ],
      skipDuplicates: true,
    });

    await prisma.cart.create({
      data: {
        userId: buyerUser.id,
        items: {
          create: [
            { productId: product1.id, quantity: 1 },
            { productId: product2.id, quantity: 2 },
          ],
        },
      },
    });

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

    const order = await prisma.order.create({
      data: {
        buyerId: buyerUser.id,
        sellerId: sellerProfile.id,
        orderNumber: 'ORD-' + Date.now(),
        status: 'pending',
        totalAmount: 131.97,
        addressId: address.id,
        items: {
          create: [
            { productId: product1.id, quantity: 1, price: 99.99 },
            { productId: product2.id, quantity: 2, price: 15.99 },
          ],
        },
      },
    });

    await prisma.order.createMany({
      data: [
        { buyerId: buyerUser.id, sellerId: sellerProfile.id, addressId: address.id, orderNumber: 'UMX-2026-1002', status: 'processing', totalAmount: 99.99, createdAt: new Date(Date.now() - 1000 * 60 * 38) },
        { buyerId: buyerUser.id, sellerId: approvedSeller.id, addressId: address.id, orderNumber: 'UMX-2026-1003', status: 'shipped', totalAmount: 24.5, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3) },
        { buyerId: buyerUser.id, sellerId: approvedSeller.id, addressId: address.id, orderNumber: 'UMX-2026-1004', status: 'delivered', totalAmount: 49, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26) },
      ],
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
    await prisma.notification.createMany({
      data: [
        { userId: adminUser.id, type: 'announcement', priority: 'high', title: 'New store submitted for verification', message: "Kwame's Tech Corner is ready for your review.", actionUrl: '/admin/moderation/stores' },
        { userId: adminUser.id, type: 'announcement', priority: 'normal', title: 'Another store joined the queue', message: 'Efua Made It submitted student verification details.', actionUrl: '/admin/moderation/stores' },
        { userId: adminUser.id, type: 'new_order_seller', priority: 'normal', title: 'A marketplace order was placed', message: 'A new order is waiting for seller fulfilment.', actionUrl: '/admin/orders' },
        { userId: adminUser.id, productId: product3.id, type: 'low_stock_alert', priority: 'high', title: 'Low stock needs attention', message: 'Study Snack Box has four units remaining.', actionUrl: '/admin/products' },
      ],
    });
  } else {
    console.log('Production: skipping test user/product seed.');
  }

  // Categories / subcategories are managed by the dedicated
  // migration (prisma/migrations/20260724_seed_categories/) and are
  // explicitly NOT touched by this seed to avoid accidental wipes.
  console.log('Skipping category seed — managed by migration 20260724_seed_categories.');

  const helpContentSections = [
    {
      page: 'dashboard-help',
      section: 'faq',
      key: 'list',
      order: 1,
      data: [
        { id: 'add-first-product', question: 'How do I add my first product?', answer: 'Go to Products in your dashboard, click Add product, fill in the title, description, price, and photos, then save. Your product will be visible in your store once published.' },
        { id: 'customize-store', question: 'How do I customize my store?', answer: 'Use the Store Builder from your dashboard. You can change layouts, colors, banners, and sections. Changes are saved automatically.' },
        { id: 'publish-store', question: 'How do I publish my store?', answer: 'After adding products and customizing your storefront, toggle Publish in your store settings. Buyers can then find and shop from your store.' },
        { id: 'change-store-info', question: 'How do I change my store information?', answer: 'Open Store settings from the dashboard sidebar. Update your name, description, logo, and contact details there.' },
        { id: 'orders', question: 'Where can I see my orders?', answer: 'Orders appear in the Orders section of your dashboard. You can view status, buyer info, and fulfillment details there.' },
        { id: 'payments', question: 'How do payouts work?', answer: 'Payouts are processed according to your account settings. You can view payout history and update payment details in Settings.' },
      ],
    },
    {
      page: 'dashboard-help',
      section: 'guides',
      key: 'list',
      order: 2,
      data: [
        { id: 'store', title: 'Setting up your store', description: 'Learn how to configure your store settings, branding, and policies.', readTime: '4 min', topics: ['Store settings', 'Branding', 'Policies', 'Verification'] },
        { id: 'products', title: 'Managing products', description: 'Add, edit, organize, and optimize your product catalog.', readTime: '6 min', topics: ['Add products', 'Inventory', 'Pricing', 'Categories'] },
        { id: 'design', title: 'Designing your storefront', description: 'Customize layouts, colors, and make your store feel like home.', readTime: '5 min', topics: ['Layouts', 'Colors', 'Banners', 'Mobile'] },
        { id: 'orders', title: 'Handling orders', description: 'Process orders, update statuses, and keep buyers happy.', readTime: '5 min', topics: ['Order flow', 'Status updates', 'Refunds', 'Tracking'] },
        { id: 'growth', title: 'Growing your audience', description: 'Share your store, engage buyers, and track growth.', readTime: '4 min', topics: ['Sharing', 'Followers', 'Promotions', 'Analytics'] },
        { id: 'customers', title: 'Understanding customers', description: 'Read insights, respond to reviews, and build relationships.', readTime: '4 min', topics: ['Audience', 'Reviews', 'Retention', 'Support'] },
      ],
    },
    {
      page: 'dashboard-help',
      section: 'tutorials',
      key: 'list',
      order: 3,
      data: [
        { id: 'store-setup', title: 'Setting up your first store', description: 'A step-by-step video walkthrough from blank dashboard to published storefront.', duration: '8 min' },
        { id: 'first-product', title: 'Adding your first product', description: 'From product photos to pricing — everything you need to list your first item.', duration: '6 min' },
        { id: 'first-sale', title: 'Preparing for your first sale', description: 'How to handle orders, update buyers, and deliver a great first experience.', duration: '7 min' },
      ],
    },
  ];

  for (const section of helpContentSections) {
    await prisma.contentSection.upsert({
      where: { page_section_key: { page: section.page, section: section.section, key: section.key } },
      update: { data: section.data, order: section.order, isActive: true },
      create: { page: section.page, section: section.section, key: section.key, data: section.data, order: section.order, isActive: true },
    });
  }

  console.log('Seed completed successfully!');
  console.log('Buyer email: buyer1@example.com');
  console.log('Seller email: seller1@example.com');
  console.log('Admin email: admin@unimartx.test');
  console.log('Admin password: admin123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
