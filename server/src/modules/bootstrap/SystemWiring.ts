export class SystemWiring {
  wire(registry: any) {
    return {
      wired: true,
      modules: registry.list ? registry.list() : []
    };
  }
}