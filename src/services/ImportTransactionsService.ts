import { getCustomRepository } from 'typeorm';
import path from 'path';
import csvParse from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';
import FindCategoryService from './FindCategoryService';
import Category from '../models/Category';

interface TransactionDTO {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

interface Request {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: Category;
}

class ImportTransactionsService {
  async execute(filename: string): Promise<Transaction[]> {
    const transactionRepository = getCustomRepository(TransactionsRepository);

    const transactionsDTO = await this.loadCSV(filename);

    await this.validateTransactions(transactionsDTO);

    const transactions = await this.parseToTransactions(transactionsDTO);

    const transactionsCreated = transactionRepository.create(transactions);

    await transactionRepository.save(transactionsCreated);

    return transactionsCreated;
  }

  private async loadCSV(filePath: string): Promise<TransactionDTO[]> {
    const transactionsDTO: TransactionDTO[] = [];

    const csvFilePath = path.resolve(__dirname, '..', '..', 'tmp', filePath);

    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    parseCSV.on('data', line => {
      transactionsDTO.push({
        title: line[0],
        type: line[1],
        value: Number(line[2]),
        category: line[3],
      });
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    return transactionsDTO;
  }

  private async validateTransactions(
    transactionsDTO: Array<TransactionDTO>,
  ): Promise<void> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const transactions = await transactionRepository.find();

    const balance = await transactionRepository.getBalance(transactions);

    transactionsDTO.forEach(({ type, value }: TransactionDTO, index) => {
      if (value < 1) {
        throw new AppError(`Valor da transação inválido na linha ${index + 1}`);
      }

      if (type !== 'income' && type !== 'outcome') {
        throw new AppError(
          `Tipo da transação deve ser income ou outcome na linha ${index + 1}`,
        );
      } else if (type === 'income') {
        balance.income += value;
        balance.total += value;
      } else if (value > balance.total) {
        throw new AppError(
          `Valor da transação não pode ser maior que o valor total disponível. Erro em linha: ${
            index + 1
          }`,
        );
      } else {
        balance.outcome += value;
        balance.total -= value;
      }
    });
  }

  private async parseToTransactions(
    transactionsDTO: TransactionDTO[],
  ): Promise<Request[]> {
    const findCategory = new FindCategoryService();
    let categoryEntity: Category = new Category();
    const transactions: Request[] = [];

    // const promises = transactionsDTO.map(
    //   async ({ category, title, type, value }) => {
    //     categoryEntity = await findCategory.execute(category);

    //     transactions.push({ category: categoryEntity, title, type, value });
    //   },
    // );

    // await Promise.all(promises);

    for (const { category, title, type, value } of transactionsDTO) {
      categoryEntity = await findCategory.execute(category);

      transactions.push({ category: categoryEntity, title, type, value });
    }

    return transactions;
  }
}

export default ImportTransactionsService;
