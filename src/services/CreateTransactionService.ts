import { getCustomRepository } from 'typeorm';

import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import FindCategoryService from './FindCategoryService';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: string;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category,
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const findCategory = new FindCategoryService();

    const categoryEntity = await findCategory.execute(category);

    if (type !== 'income' && type !== 'outcome') {
      throw new AppError(
        'Tipo de transação não pode ser diferente de entrada e saída',
      );
    }

    if (value < 1) {
      throw new AppError('Valor da transação não pode ser menor que 1 real');
    }

    const transactions = await transactionRepository.find();

    const { total } = await transactionRepository.getBalance(transactions);

    if (type === 'outcome' && value > total) {
      throw new AppError(
        'Valor da transação não pode ser maior que valor disponível',
      );
    }

    const transaction = transactionRepository.create({
      title,
      value,
      type,
      category: categoryEntity,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
