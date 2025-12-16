import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WalletEntity } from '../entities/wallet.entity';
import { TransactionEntity, TransactionStatus, TransactionType } from '../../transaction/entities/transaction.entity';
import { CreateWalletDto } from '../dto/create-wallet.dto';
import { FundWalletDto } from '../dto/fund-wallet.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepo: Repository<WalletEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateWalletDto): Promise<WalletEntity> {
    const wallet = this.walletRepo.create({
      balance: '0',
      ...dto,
    });
    return await this.walletRepo.save(wallet);
  }

  async fundWallet(walletId: string, dto: FundWalletDto, idempotencyKey?: string): Promise<WalletEntity> {
    // Check for existing transaction with this idempotency key
    if (idempotencyKey) {
      const existingTransaction = await this.transactionRepo.findOne({
        where: { idempotencyKey, type: TransactionType.CREDIT },
        relations: ['wallet'],
      });
      
      if (existingTransaction && existingTransaction.wallet.id === walletId) {
        // Return the wallet as it was after the original transaction
        const wallet = await this.walletRepo.findOne({ where: { id: walletId } });
        if (!wallet) {
          throw new NotFoundException('Wallet not found');
        }
        return wallet;
      }
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Use pessimistic lock
      const wallet = await queryRunner.manager.findOne(WalletEntity, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const currentBalance = parseFloat(wallet.balance ?? '0');
      const newBalance = (currentBalance + dto.amount).toFixed(2);

      wallet.balance = newBalance;
      await queryRunner.manager.save(wallet);

      // Create transaction record
      const transaction = queryRunner.manager.create(TransactionEntity, {
        wallet,
        amount: dto.amount.toFixed(2),
        type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
        description: `Fund wallet with ${dto.amount}`,
        idempotencyKey,
      });

      await queryRunner.manager.save(transaction);
      
      await queryRunner.commitTransaction();
      return wallet;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOneWithTransactions(walletId: string): Promise<WalletEntity> {
    const wallet = await this.walletRepo
      .createQueryBuilder('wallet')
      .leftJoinAndSelect('wallet.transactions', 'transaction')
      .where('wallet.id = :id', { id: walletId })
      .orderBy('transaction.createdAt', 'DESC')
      .getOne();

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }
}

