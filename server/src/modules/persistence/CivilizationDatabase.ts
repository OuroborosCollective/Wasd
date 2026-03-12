export class CivilizationDatabase {
  private civilizations = new Map<string, any>();

  saveCivilization(civ: any) {
    this.civilizations.set(civ.id, civ);
  }

  loadCivilization(id: string) {
    return this.civilizations.get(id) ?? null;
  }
}