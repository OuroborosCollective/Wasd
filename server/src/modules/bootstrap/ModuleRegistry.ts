export class ModuleRegistry {
  private modules = new Map<string, any>();

  register(name: string, instance: any) {
    this.modules.set(name, instance);
    return instance;
  }

  get(name: string) {
    return this.modules.get(name) || null;
  }

  list() {
    return [...this.modules.keys()];
  }
}