import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TransactionEntity } from '../../transaction/entities/transaction.entity';

@Entity({ name: 'wallets' })
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  balance: string;

  @Column({ nullable: true })
  ownerName?: string;

  @OneToMany(() => TransactionEntity, (transaction) => transaction.wallet, { cascade: true })
  transactions: TransactionEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

