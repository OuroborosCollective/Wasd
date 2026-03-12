export class AgingSystem {
  age(entity: any, years: number = 1) {
    entity.age = (entity.age || 0) + years;
    return entity.age;
  }
}