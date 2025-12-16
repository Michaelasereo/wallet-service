import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletEntity } from './entities/wallet.entity';
import { TransactionEntity } from '../transaction/entities/transaction.entity';
import { WalletService } from './service/wallet.service';
import { WalletController } from './controllers/wallet.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WalletEntity, TransactionEntity])],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [TypeOrmModule, WalletService],
})
export class WalletModule {}

