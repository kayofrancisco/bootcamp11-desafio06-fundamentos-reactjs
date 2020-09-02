import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(transactions: Transaction[]): Promise<Balance> {
    const income = transactions
      .filter(({ type }) => type === 'income')
      .reduce((total, { value }) => {
        return total + Number(value);
      }, Number(0));

    const outcome = transactions
      .filter(({ type }) => type === 'outcome')
      .reduce((total, { value }) => total + Number(value), Number(0));

    const total = income - outcome;

    const balance: Balance = {
      income: Number(income),
      outcome: Number(outcome),
      total,
    };

    return balance;
  }
}

export default TransactionsRepository;
