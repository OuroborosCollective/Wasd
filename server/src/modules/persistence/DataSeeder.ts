// @ARE-GUARD-EXEMPT: non-sim module
export class DataSeeder {
  seed(items:any[]){
    return {
      inserted: items.length
    };
  }
}