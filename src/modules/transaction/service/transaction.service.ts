import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TransactionEntity, TransactionStatus, TransactionType } from '../entities/transaction.entity';
import { WalletEntity } from '../../wallet/entities/wallet.entity';
import { CreateTransferDto } from '../dto/create-transfer.dto';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepo: Repository<WalletEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async transfer(dto: CreateTransferDto, idempotencyKey?: string) {
    if (dto.fromWalletId === dto.toWalletId) {
      throw new BadRequestException('fromWalletId and toWalletId must differ');
    }
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Check for existing transfer with this idempotency key
    if (idempotencyKey) {
      const existingTransaction = await this.transactionRepo.findOne({
        where: { idempotencyKey, type: TransactionType.DEBIT },
        relations: ['wallet'],
      });
      
      if (existingTransaction && existingTransaction.wallet.id === dto.fromWalletId) {
        // Return the result from the original transfer
        const fromWallet = await this.walletRepo.findOne({ where: { id: dto.fromWalletId } });
        const toWallet = await this.walletRepo.findOne({ where: { id: dto.toWalletId } });
        const creditTx = await this.transactionRepo.findOne({
          where: { idempotencyKey, type: TransactionType.CREDIT },
        });
        
        return {
          fromWallet,
          toWallet,
          debitTransactionId: existingTransaction.id,
          creditTransactionId: creditTx?.id,
        };
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const fromWallet = await manager.findOne(WalletEntity, {
        where: { id: dto.fromWalletId },
        lock: { mode: 'pessimistic_write' },
      });
      const toWallet = await manager.findOne(WalletEntity, {
        where: { id: dto.toWalletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!fromWallet || !toWallet) {
        throw new NotFoundException('One or both wallets not found');
      }

      const fromBalance = parseFloat(fromWallet.balance ?? '0');
      if (fromBalance < dto.amount) {
        throw new BadRequestException('Insufficient funds');
      }

      const toBalance = parseFloat(toWallet.balance ?? '0');

      fromWallet.balance = (fromBalance - dto.amount).toFixed(2);
      toWallet.balance = (toBalance + dto.amount).toFixed(2);

      await manager.save(WalletEntity, fromWallet);
      await manager.save(WalletEntity, toWallet);

      const debitTx = manager.create(TransactionEntity, {
        wallet: fromWallet,
        amount: dto.amount.toFixed(2),
        type: TransactionType.DEBIT,
        status: TransactionStatus.COMPLETED,
        description: `Transfer to wallet ${dto.toWalletId}`,
        idempotencyKey,
      });

      const creditTx = manager.create(TransactionEntity, {
        wallet: toWallet,
        amount: dto.amount.toFixed(2),
        type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
        description: `Transfer from wallet ${dto.fromWalletId}`,
        idempotencyKey,
      });

      await manager.save(TransactionEntity, debitTx);
      await manager.save(TransactionEntity, creditTx);

      return {
        fromWallet,
        toWallet,
        debitTransactionId: debitTx.id,
        creditTransactionId: creditTx.id,
      };
    });
  }
}

