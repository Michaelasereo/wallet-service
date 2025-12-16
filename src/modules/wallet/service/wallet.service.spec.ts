import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WalletService } from './wallet.service';
import { WalletEntity } from '../entities/wallet.entity';
import { TransactionEntity, TransactionType, TransactionStatus } from '../../transaction/entities/transaction.entity';
import { CreateWalletDto } from '../dto/create-wallet.dto';
import { FundWalletDto } from '../dto/fund-wallet.dto';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepository: Repository<WalletEntity>;
  let transactionRepository: Repository<TransactionEntity>;
  let dataSource: DataSource;
  let queryRunner: any;

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(WalletEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              leftJoinAndSelect: jest.fn().returnThis(),
              where: jest.fn().returnThis(),
              orderBy: jest.fn().returnThis(),
              getOne: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => queryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepository = module.get<Repository<WalletEntity>>(getRepositoryToken(WalletEntity));
    transactionRepository = module.get<Repository<TransactionEntity>>(getRepositoryToken(TransactionEntity));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a wallet with zero balance', async () => {
      const createWalletDto: CreateWalletDto = { ownerName: 'Test User' };
      const mockWallet = {
        id: 'test-uuid',
        balance: '0',
        ownerName: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(walletRepository, 'create').mockReturnValue(mockWallet as WalletEntity);
      jest.spyOn(walletRepository, 'save').mockResolvedValue(mockWallet as WalletEntity);

      const result = await service.create(createWalletDto);

      expect(walletRepository.create).toHaveBeenCalledWith({
        balance: '0',
        ownerName: 'Test User',
      });
      expect(walletRepository.save).toHaveBeenCalled();
      expect(result.balance).toBe('0');
      expect(result.ownerName).toBe('Test User');
    });

    it('should create a wallet without owner name', async () => {
      const createWalletDto: CreateWalletDto = {};
      const mockWallet = {
        id: 'test-uuid',
        balance: '0',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(walletRepository, 'create').mockReturnValue(mockWallet as WalletEntity);
      jest.spyOn(walletRepository, 'save').mockResolvedValue(mockWallet as WalletEntity);

      const result = await service.create(createWalletDto);

      expect(result.balance).toBe('0');
    });
  });

  describe('fundWallet', () => {
    it('should add amount to wallet balance', async () => {
      const fundDto: FundWalletDto = { amount: 100 };
      const walletId = 'test-uuid';
      const mockWallet = {
        id: walletId,
        balance: '0',
        ownerName: 'Test User',
      };

      queryRunner.manager.findOne.mockResolvedValue(mockWallet);
      queryRunner.manager.save.mockResolvedValue({ ...mockWallet, balance: '100.00' });
      queryRunner.manager.create.mockReturnValue({
        wallet: mockWallet,
        amount: '100.00',
        type: TransactionType.CREDIT,
        status: TransactionStatus.COMPLETED,
      });

      const result = await service.fundWallet(walletId, fundDto);

      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.findOne).toHaveBeenCalledWith(WalletEntity, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should handle idempotency - return existing result', async () => {
      const fundDto: FundWalletDto = { amount: 100 };
      const walletId = 'test-uuid';
      const idempotencyKey = 'test-key';
      
      const existingTransaction = {
        id: 'existing-tx',
        amount: '100.00',
        type: TransactionType.CREDIT,
        wallet: { id: walletId },
      };

      const existingWallet = {
        id: walletId,
        balance: '100.00',
      };

      jest.spyOn(transactionRepository, 'findOne').mockResolvedValue(existingTransaction as TransactionEntity);
      jest.spyOn(walletRepository, 'findOne').mockResolvedValue(existingWallet as WalletEntity);

      const result = await service.fundWallet(walletId, fundDto, idempotencyKey);

      expect(transactionRepository.findOne).toHaveBeenCalledWith({
        where: { idempotencyKey, type: TransactionType.CREDIT },
        relations: ['wallet'],
      });
      expect(walletRepository.findOne).toHaveBeenCalledWith({ where: { id: walletId } });
      expect(result.balance).toBe('100.00');
      expect(queryRunner.connect).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const fundDto: FundWalletDto = { amount: 100 };
      const walletId = 'non-existent';

      queryRunner.manager.findOne.mockResolvedValue(null);

      await expect(service.fundWallet(walletId, fundDto)).rejects.toThrow('Wallet not found');
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException for negative amount', async () => {
      const fundDto: FundWalletDto = { amount: -10 };
      const walletId = 'test-uuid';

      await expect(service.fundWallet(walletId, fundDto)).rejects.toThrow('Amount must be positive');
    });
  });

  describe('findOneWithTransactions', () => {
    it('should return wallet with transactions', async () => {
      const walletId = 'test-uuid';
      const mockWallet = {
        id: walletId,
        balance: '100.00',
        transactions: [
          {
            id: 'tx-1',
            amount: '100.00',
            type: TransactionType.CREDIT,
            createdAt: new Date(),
          },
        ],
      };

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().returnThis(),
        where: jest.fn().returnThis(),
        orderBy: jest.fn().returnThis(),
        getOne: jest.fn().mockResolvedValue(mockWallet),
      };

      jest.spyOn(walletRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      const result = await service.findOneWithTransactions(walletId);

      expect(result).toEqual(mockWallet);
      expect(queryBuilder.where).toHaveBeenCalledWith('wallet.id = :id', { id: walletId });
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const walletId = 'non-existent';

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().returnThis(),
        where: jest.fn().returnThis(),
        orderBy: jest.fn().returnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(walletRepository, 'createQueryBuilder').mockReturnValue(queryBuilder as any);

      await expect(service.findOneWithTransactions(walletId)).rejects.toThrow('Wallet not found');
    });
  });
});

