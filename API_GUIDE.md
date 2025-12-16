# Wallet Service API Guide by Opeyemi Michaell-Asere 

## Overview
A complete wallet management system with transaction capabilities built with NestJS, TypeORM, and SQLite.

## API Endpoints

### Wallet Management

#### 1. Create Wallet
```http
POST /wallets
Content-Type: application/json

{
  "ownerName": "John Doe"  // Optional
}
```

**Response:**
```json
{
  "id": "uuid",
  "balance": "0.00",
  "ownerName": "John Doe",
  "createdAt": "2025-12-16T10:00:00.000Z",
  "updatedAt": "2025-12-16T10:00:00.000Z"
}
```

#### 2. Fund Wallet
```http
POST /wallets/:id/fund
Content-Type: application/json

{
  "amount": 100.50
}
```

**Response:**
```json
{
  "id": "uuid",
  "balance": "100.50",
  "ownerName": "John Doe",
  "createdAt": "2025-12-16T10:00:00.000Z",
  "updatedAt": "2025-12-16T10:01:00.000Z"
}
```

#### 3. Get Wallet with Transactions
```http
GET /wallets/:id
```

**Response:**
```json
{
  "id": "uuid",
  "balance": "100.50",
  "ownerName": "John Doe",
  "transactions": [
    {
      "id": "uuid",
      "amount": "100.50",
      "type": "CREDIT",
      "status": "COMPLETED",
      "createdAt": "2025-12-16T10:01:00.000Z"
    }
  ],
  "createdAt": "2025-12-16T10:00:00.000Z",
  "updatedAt": "2025-12-16T10:01:00.000Z"
}
```

### Transfers

#### Transfer Funds Between Wallets
```http
POST /transfers
Content-Type: application/json

{
  "fromWalletId": "uuid-1",
  "toWalletId": "uuid-2",
  "amount": 25.50
}
```

**Response:**
```json
{
  "fromWallet": {
    "id": "uuid-1",
    "balance": "75.00",
    ...
  },
  "toWallet": {
    "id": "uuid-2",
    "balance": "25.50",
    ...
  },
  "debitTransactionId": "uuid",
  "creditTransactionId": "uuid"
}
```

## Error Responses

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Wallet not found",
  "error": "Not Found"
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Insufficient funds",
  "error": "Bad Request"
}
```

## Features

✅ **Wallet Management**
- Create wallets with optional owner name
- Fund wallets with positive amounts
- View wallet details with transaction history

✅ **Transfers**
- Transfer funds between wallets
- Atomic transactions (all-or-nothing)
- Pessimistic locking for concurrency safety
- Automatic transaction records (debit + credit)

✅ **Transaction History**
- All transactions are recorded
- Transactions include type (CREDIT/DEBIT) and status
- Ordered by creation date (newest first)

✅ **Validation**
- UUID validation for wallet IDs
- Positive amount validation
- Same wallet transfer prevention
- Insufficient funds check

## Swagger Documentation

Visit `http://localhost:3000/api` for interactive API documentation.

## Database

- **Type**: SQLite
- **File**: `database.sqlite` (created automatically)
- **Synchronize**: Enabled (development only)

## Example Usage

```bash
# 1. Create a wallet
curl -X POST http://localhost:3000/wallets \
  -H "Content-Type: application/json" \
  -d '{"ownerName": "Alice"}'

# 2. Fund the wallet
curl -X POST http://localhost:3000/wallets/{wallet-id}/fund \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'

# 3. Create another wallet
curl -X POST http://localhost:3000/wallets \
  -H "Content-Type: application/json" \
  -d '{"ownerName": "Bob"}'

# 4. Transfer funds
curl -X POST http://localhost:3000/transfers \
  -H "Content-Type: application/json" \
  -d '{
    "fromWalletId": "alice-wallet-id",
    "toWalletId": "bob-wallet-id",
    "amount": 25
  }'

# 5. Check wallet balance
curl http://localhost:3000/wallets/{wallet-id}
```

