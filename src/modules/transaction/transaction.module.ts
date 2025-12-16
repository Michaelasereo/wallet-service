import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionEntity } from './entities/transaction.entity';
import { TransactionService } from './service/transaction.service';
import { TransactionController } from './controllers/transaction.controller';
import { WalletEntity } from '../wallet/entities/wallet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionEntity, WalletEntity])],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TypeOrmModule, TransactionService],
})
export class TransactionModule {}

