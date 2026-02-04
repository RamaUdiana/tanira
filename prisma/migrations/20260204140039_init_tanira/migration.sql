-- CreateTable
CREATE TABLE `crop` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `growthDuration` INTEGER NOT NULL,
    `avgYieldPerHa` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `croptrend` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cropId` INTEGER NOT NULL,
    `region` VARCHAR(191) NOT NULL,
    `trendStatus` ENUM('naik', 'stabil', 'turun') NOT NULL,
    `riskLevel` ENUM('rendah', 'sedang', 'tinggi') NOT NULL,
    `avgPrice` DOUBLE NOT NULL,

    INDEX `CropTrend_cropId_fkey`(`cropId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `farmerprofile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `landArea` DOUBLE NOT NULL,
    `landType` VARCHAR(191) NOT NULL,
    `season` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `FarmerProfile_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `harvestlisting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `cropId` INTEGER NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `price` DOUBLE NOT NULL,
    `harvestDate` DATETIME(3) NOT NULL,
    `status` ENUM('draft', 'active', 'sold') NOT NULL,
    `approved` BOOLEAN NOT NULL DEFAULT false,
    `description` TEXT NULL,
    `minOrder` DOUBLE NOT NULL DEFAULT 1,
    `imageUrl` VARCHAR(191) NULL,
    `lastLogDate` DATETIME(3) NULL,
    `lastLogMessage` TEXT NULL,
    `progressStage` INTEGER NOT NULL DEFAULT 0,

    INDEX `HarvestListing_cropId_fkey`(`cropId`),
    INDEX `HarvestListing_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `listingId` INTEGER NOT NULL,
    `buyerId` INTEGER NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `totalPrice` DOUBLE NOT NULL,
    `status` ENUM('pending', 'paid', 'finished') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Order_buyerId_fkey`(`buyerId`),
    INDEX `Order_listingId_fkey`(`listingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `passwordresettoken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `lastResendAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordResetToken_token_key`(`token`),
    INDEX `PasswordResetToken_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plantingplan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `cropId` INTEGER NOT NULL,
    `landArea` DOUBLE NOT NULL,
    `estimatedHarvest` DATETIME(3) NOT NULL,
    `expectedYield` DOUBLE NOT NULL,
    `expectedProfit` DOUBLE NOT NULL,
    `riskLevel` ENUM('rendah', 'sedang', 'tinggi') NOT NULL,

    INDEX `PlantingPlan_cropId_fkey`(`cropId`),
    INDEX `PlantingPlan_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `review` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `harvestListingId` INTEGER NULL,
    `toolListingId` INTEGER NULL,

    INDEX `Review_userId_fkey`(`userId`),
    INDEX `fk_review_harvest`(`harvestListingId`),
    INDEX `fk_review_tool`(`toolListingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `toolbooking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `toolId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `status` ENUM('booked', 'completed') NOT NULL,

    INDEX `ToolBooking_toolId_fkey`(`toolId`),
    INDEX `ToolBooking_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `toollisting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `toolName` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `pricePerDay` DOUBLE NOT NULL,
    `availability` BOOLEAN NOT NULL DEFAULT true,
    `category` VARCHAR(191) NOT NULL DEFAULT 'Alat Berat',
    `description` TEXT NULL,
    `imageUrl` VARCHAR(191) NULL,

    INDEX `ToolListing_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('petani', 'pembeli', 'penyedia', 'admin', 'none') NOT NULL DEFAULT 'none',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `province` VARCHAR(191) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `verificationToken` TEXT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `croptrend` ADD CONSTRAINT `CropTrend_cropId_fkey` FOREIGN KEY (`cropId`) REFERENCES `crop`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `farmerprofile` ADD CONSTRAINT `FarmerProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `harvestlisting` ADD CONSTRAINT `HarvestListing_cropId_fkey` FOREIGN KEY (`cropId`) REFERENCES `crop`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `harvestlisting` ADD CONSTRAINT `HarvestListing_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `Order_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order` ADD CONSTRAINT `Order_listingId_fkey` FOREIGN KEY (`listingId`) REFERENCES `harvestlisting`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `passwordresettoken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plantingplan` ADD CONSTRAINT `PlantingPlan_cropId_fkey` FOREIGN KEY (`cropId`) REFERENCES `crop`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `plantingplan` ADD CONSTRAINT `PlantingPlan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review` ADD CONSTRAINT `Review_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review` ADD CONSTRAINT `fk_review_harvest` FOREIGN KEY (`harvestListingId`) REFERENCES `harvestlisting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `review` ADD CONSTRAINT `fk_review_tool` FOREIGN KEY (`toolListingId`) REFERENCES `toollisting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `toolbooking` ADD CONSTRAINT `ToolBooking_toolId_fkey` FOREIGN KEY (`toolId`) REFERENCES `toollisting`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `toolbooking` ADD CONSTRAINT `ToolBooking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `toollisting` ADD CONSTRAINT `ToolListing_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
