import fs from 'fs';
import path from 'path';

export class PersistenceManager {
  private filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), 'data', 'players.json');
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  save(data: any) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('Failed to save persistence data:', err);
    }
  }

  load(): any {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (err) {
      console.error('Failed to load persistence data:', err);
    }
    return {};
  }
}
