export class SafeMigrationRunner {
  run(migrations:any[]){
    return {
      count: migrations.length,
      ok: true
    };
  }
}