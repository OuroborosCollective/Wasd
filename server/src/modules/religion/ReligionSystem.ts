export class ReligionSystem {
  private religions = new Map<string, any>();

  registerReligion(id: string, data: any) {
    this.religions.set(id, data);
  }

  getReligion(id: string) {
    return this.religions.get(id);
  }
}