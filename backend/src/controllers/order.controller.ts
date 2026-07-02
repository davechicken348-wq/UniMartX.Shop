import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { sendBuyerOrderConfirmationEmail, sendSellerNewOrderEmail, sendLowStockEmail } from '../services/email.service';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
function absUrl(path: string | null | undefined): string | null {
  const p = path || '';
  if (!p) return null;
  if (/^https?:/.test(p) || p.startsWith('data:') || p.startsWith('blob:')) return p;
  return `${BACKEND_URL}${p}`;
}

function decodeToken(req: Request): string {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) throw new AppError('Authentication required', 401);
  try {
    return (jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!) as { userId: string }).userId;
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
}

function fmt(n: number): string {
  return `GH₵ ${n.toFixed(2)}`;
}

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  const userId = decodeToken(req);
  const { items, sellerFulfillments, address, payment } = req.body;

  if (!Array.isArray(items) || !items.length) {
    throw new AppError('Cart is empty', 400);
  }

  const productIds = items.map(i => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: { seller: { select: { id: true, storeName: true, userId: true } } },
  });
  const productMap = new Map(products.map(p => [p.id, p]));

  const missing = items.filter(i => !productMap.has(i.productId));
  if (missing.length) throw new AppError(`Product not found: ${missing[0].productId}`, 404);

  const stockErrors: string[] = [];
  items.forEach(i => {
    const p = productMap.get(i.productId);
    if (p && i.quantity > p.stock) stockErrors.push(`${p.name}: only ${p.stock} left`);
  });
  if (stockErrors.length) throw new AppError(stockErrors.join('; '), 400);

  let addressRecord = await prisma.address.findFirst({
    where: { userId, isDefault: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!addressRecord && address) {
    addressRecord = await prisma.address.create({
      data: {
        userId,
        label: address.fullName || 'Checkout address',
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        zipCode: '',
        country: address.country || 'Ghana',
        isDefault: true,
        notes: address.notes || null,
      },
    });
  }
  if (!addressRecord) throw new AppError('Delivery address is required', 400);

  const itemsBySeller = new Map<string, typeof items>();
  items.forEach(i => {
    const product = productMap.get(i.productId)!;
    const sid = product.sellerId;
    if (!itemsBySeller.has(sid)) itemsBySeller.set(sid, []);
    itemsBySeller.get(sid)!.push({ ...i, product });
  });

  const createdOrders: { orderNumber: string; sellerId: string; orderDbId: string; totalAmount: number }[] = [];

  for (const [sellerId, sellerItems] of itemsBySeller.entries()) {
    const sellerFulfillment = (sellerFulfillments && sellerFulfillments[sellerId]) || { fulfillment: 'pickup', deliveryFee: 0 };

    const subtotal = sellerItems.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
    const deliveryFee = Number(sellerFulfillment.deliveryFee) || 0;
    const totalAmount = subtotal + deliveryFee;

    const order = await prisma.order.create({
      data: {
        buyerId: userId,
        sellerId,
        totalAmount,
        addressId: addressRecord.id,
        notes: address.notes || null,
        paymentMethod: payment?.method || 'momo',
        paymentDetails: payment ? { momoNetwork: payment.momoNetwork, momoNumber: payment.momoNumber } : undefined,
        fulfillmentType: sellerFulfillment.fulfillment || 'pickup',
        sellerDeliveryFee: Number(sellerFulfillment.deliveryFee) || 0,
      },
      include: {
        items: {
          select: {
            productId: true,
            quantity: true,
            price: true,
            product: { select: { name: true } },
          },
        },
        seller: {
          select: {
            userId: true,
            storeName: true,
          },
        },
      },
    });

    createdOrders.push({ orderNumber: order.orderNumber, sellerId, orderDbId: order.id, totalAmount });

    const LOW_STOCK_THRESHOLD = 5;

    for (const i of sellerItems) {
      const updatedProduct = await prisma.product.update({
        where: { id: i.productId },
        data: { stock: { decrement: i.quantity } },
        select: { id: true, name: true, stock: true, sellerId: true },
      });
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: i.productId,
          quantity: i.quantity,
          price: Number(i.product.price),
        },
      });

      if (updatedProduct.stock <= LOW_STOCK_THRESHOLD) {
        const sellerRecord = await prisma.seller.findUnique({
          where: { id: updatedProduct.sellerId },
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        });
        if (sellerRecord?.user) {
          const su = sellerRecord.user;
          const suName = `${su.firstName} ${su.lastName}`.trim();
          void prisma.notification.create({
            data: {
              userId: su.id,
              type: 'low_stock_alert',
              title: updatedProduct.stock === 0 ? 'Product out of stock' : 'Low stock alert',
              message: updatedProduct.stock === 0
                ? `"${updatedProduct.name}" is now out of stock. Restock to keep selling.`
                : `"${updatedProduct.name}" has only ${updatedProduct.stock} unit${updatedProduct.stock === 1 ? '' : 's'} left.`,
              priority: updatedProduct.stock === 0 ? 'high' : 'normal',
              productId: updatedProduct.id,
              actionUrl: `/pages/seller/private/products/product-details.html#id=${updatedProduct.id}`,
              metadata: { stock: updatedProduct.stock, productName: updatedProduct.name },
            },
          }).catch(() => {});
          if (su.email) {
            void sendLowStockEmail(su.email, suName, updatedProduct.name, updatedProduct.stock, updatedProduct.id);
          }
        }
      }
    }

    try {
      await prisma.notification.create({
        data: {
          userId: order.seller.userId,
          type: 'new_order_seller',
          title: 'New order received',
          message: `Order #${order.orderNumber} — ${sellerItems.length} item(s), total ${fmt(totalAmount)}`,
          priority: 'high',
          actionUrl: `/pages/seller/private/orders/order-details.html?id=${order.id}`,
          metadata: { orderId: order.id, orderNumber: order.orderNumber },
        },
      });
    } catch { /* ignore */ }
  }

  try {
    const buyerUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    const buyerName = buyerUser ? `${buyerUser.firstName} ${buyerUser.lastName}`.trim() : 'Customer';

    const uniqueSellerIds = Array.from(new Set(createdOrders.map(o => o.sellerId)));
    const sellerUsers = await prisma.seller.findMany({
      where: { id: { in: uniqueSellerIds } },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
    const sellerEmailMap = new Map(sellerUsers.map(s => [s.id, s.user]));
    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';

    for (const co of createdOrders) {
      const sellerUser = sellerEmailMap.get(co.sellerId);
      const sellerEmail = sellerUser?.email;
      const sellerName = sellerUser ? `${sellerUser.firstName} ${sellerUser.lastName}`.trim() : 'Seller';
      const sellerItems = itemsBySeller.get(co.sellerId) || [];
      const orderItemsForEmail = sellerItems.map(i => ({
        name: (i.product as any).name,
        quantity: i.quantity,
        price: Number((i.product as any).price),
      }));

      if (sellerEmail) {
        void sendSellerNewOrderEmail(
          sellerEmail,
          sellerName,
          co.orderNumber,
          orderItemsForEmail,
          co.totalAmount,
          `${frontendBase}/pages/seller/private/orders/order-details.html?id=${co.orderDbId}`,
          buyerName,
          addressRecord.street
        );
      }

      if (buyerUser?.email) {
        void sendBuyerOrderConfirmationEmail(
          buyerUser.email,
          buyerName,
          co.orderNumber,
          orderItemsForEmail,
          co.totalAmount,
          `${frontendBase}/pages/buyer/order-history/order-details.html?id=${co.orderDbId}`,
          (itemsBySeller.get(co.sellerId)?.[0]?.product as any)?.seller?.storeName || 'seller'
        );
      }
    }
  } catch { /* ignore email failures */ }

  const cart = await prisma.cart.findFirst({ where: { userId } });
  if (cart) {
    const orderedIds: string[] = [];
    for (const i of items) {
      const ci = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId: i.productId } });
      if (ci) orderedIds.push(ci.id);
    }
    if (orderedIds.length) await prisma.cartItem.deleteMany({ where: { id: { in: orderedIds } } });
  }

  res.status(201).json({
    success: true,
    data: {
      orderNumbers: createdOrders.map(o => o.orderNumber),
      firstOrderId: createdOrders[0]?.orderNumber,
      firstOrderDbId: createdOrders[0]?.orderDbId,
      allOrderDbIds: createdOrders.map(o => o.orderDbId),
      emailsSent: createdOrders.length > 0 && !!process.env.EMAIL_USER,
    },
  });
};
