-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('welcome', 'order_placed', 'order_confirmed', 'order_preparing', 'order_shipped', 'order_delivered', 'order_cancelled', 'order_refunded', 'wishlist_price_drop', 'wishlist_back_in_stock', 'product_wishlisted', 'new_review', 'review_reply', 'login_alert', 'password_changed', 'email_verified', 'new_order_seller', 'low_stock_alert', 'promotion', 'announcement', 'seller_followed', 'new_follower');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType" USING "type"::"NotificationType";

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "priority" TYPE "NotificationPriority" USING "priority"::"NotificationPriority";
