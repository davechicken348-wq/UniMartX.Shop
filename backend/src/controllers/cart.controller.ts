import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';

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
    const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!) as { userId: string };
    return decoded.userId;
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }
}

export const getCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) throw new AppError('Authentication required', 401);
    const token = authHeader.slice(7);
    let decoded: { userId: string };
    try { decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }; }
    catch { throw new AppError('Invalid or expired token', 401); }

    let cart = await prisma.cart.findUnique({
      where: { userId: decoded.userId },
      include: {
          items: {
            include: {
              product: {
                  select: {
                    id: true, name: true, price: true, image: true,
                    stock: true, isActive: true, details: true,
                    seller: {
                      select: {
                        id: true, storeName: true, storeAvatar: true, storeBanner: true,
                        pickupAddress: true, businessType: true, universityAffiliation: true, deliveryFee: true,
                      },
                    },
                  },
              },
            },
          },
        },
      });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: decoded.userId },
        include: {
          items: {
            include: {
            product: { select: { id: true, name: true, price: true, image: true, stock: true, isActive: true, details: true, seller: { select: { storeName: true } } } },
            },
          },
        },
      });
    }

    const totalQty = (cart!.items || []).reduce((sum: number, i: any) => sum + i.quantity, 0);
    const subtotal = (cart!.items || []).reduce(
      (sum: number, i: any) => sum + (i.product ? Number(i.product.price) * i.quantity : 0), 0
    );

    res.status(200).json({
      success: true,
      data: {
        id: cart!.id,
        userId: cart!.userId,
        itemCount: totalQty,
        subtotal,
        items: (cart!.items || []).map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          subtotal: item.product ? Number(item.product.price) * item.quantity : 0,
          product: item.product
            ? {
                ...item.product,
                price: Number(item.product.price),
                image: absUrl(item.product.image || ''),
                seller: {
                  ...item.product.seller,
                  storeAvatar: absUrl(item.product.seller.storeAvatar),
                  deliveryFee: item.product.seller.deliveryFee !== null && item.product.seller.deliveryFee !== undefined ? parseFloat(item.product.seller.deliveryFee.toString()) : null,
                },
              }
            : null,
        })),
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to fetch cart', 500);
  }
};

export const addToCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = decodeToken(req);
    const { productId, quantity = 1 } = req.body;
    if (!productId) throw new AppError('productId is required', 400);

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, stock: true, isActive: true } });
    if (!product || !product.isActive) throw new AppError('Product not found', 404);

    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) cart = await prisma.cart.create({ data: { userId } });

    const existing = await prisma.cartItem.findFirst({ where: { cartId: cart.id, productId } });
    let item;
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock) throw new AppError(`Only ${product.stock} left in stock`, 400);
      item = await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQty } });
    } else {
      if (quantity > product.stock) throw new AppError(`Only ${product.stock} left in stock`, 400);
      item = await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity } });
    }

    const count = await prisma.cartItem.aggregate({ where: { cartId: cart.id }, _sum: { quantity: true } });
    res.status(200).json({ success: true, data: item, cartCount: count._sum.quantity || 0 });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to add to cart', 500);
  }
};

export const updateCartItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = decodeToken(req);
    const { itemId } = req.params;
    const { quantity } = req.body;
    if (typeof quantity !== 'number' || quantity < 1) throw new AppError('Valid quantity is required', 400);

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: { select: { userId: true } }, product: { select: { id: true, stock: true } } },
    });
    if (!item) throw new AppError('Cart item not found', 404);
    if (item.cart.userId !== userId) throw new AppError('Forbidden', 403);
    if (item.product && quantity > item.product.stock) throw new AppError(`Only ${item.product.stock} left in stock`, 400);

    const updated = await prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
    const count = await prisma.cartItem.aggregate({ where: { cartId: updated.cartId }, _sum: { quantity: true } });

    res.status(200).json({
      success: true,
      data: { id: updated.id, quantity: updated.quantity, cartCount: count._sum.quantity || 0 },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to update cart item', 500);
  }
};

export const removeFromCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = decodeToken(req);
    const { itemId } = req.params;
    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: { select: { userId: true, id: true } } },
    });
    if (!item) throw new AppError('Cart item not found', 404);
    if (item.cart.userId !== userId) throw new AppError('Forbidden', 403);

    const cartId = item.cartId;
    await prisma.cartItem.delete({ where: { id: itemId } });

    const count = await prisma.cartItem.aggregate({ where: { cartId }, _sum: { quantity: true } });
    res.status(200).json({ success: true, message: 'Item removed from cart', cartCount: count._sum.quantity || 0 });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to remove from cart', 500);
  }
};

export const clearCart = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = decodeToken(req);
    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    res.status(200).json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to clear cart', 500);
  }
};
