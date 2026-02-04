-- AlterTable
ALTER TABLE `toolbooking` MODIFY `status` ENUM('booked', 'completed', 'pending') NOT NULL;
