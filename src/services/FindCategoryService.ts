import { getCustomRepository } from 'typeorm';
import Category from '../models/Category';
import CategoriesRepository from '../repositories/CategoriesRepository copy';

class FindCategoryService {
  public async execute(title: string): Promise<Category> {
    const categoryRepository = getCustomRepository(CategoriesRepository);

    let category = await categoryRepository.findOne({ where: { title } });

    if (!category) {
      category = categoryRepository.create({ title });

      await categoryRepository.save(category);
    }

    return category;
  }
}

export default FindCategoryService;
