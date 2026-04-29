import { simpleGit, SimpleGit } from 'simple-git';

export class GitClient {
    private git: SimpleGit;

    constructor(workingDir: string = process.cwd()) {
        this.git = simpleGit(workingDir);
    }

    /**
     * Identifiziert alle Dateien (committed, staged, unstaged), 
     * die innerhalb der letzten angegebenen Stunden modifiziert wurden.
     */
    public async getRecentlyModifiedFiles(hours: number): Promise<string[]> {
        const since = `${hours} hours ago`;

        const logData = await this.git.raw([
            'log',
            `--since=${since}`,
            '--name-only',
            '--pretty=format:'
        ]);

        const committedFiles = logData
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const status = await this.git.status();
        const localFiles = status.files.map(f => f.path);

        const resultSet = new Set<string>([...committedFiles, ...localFiles]);
        return Array.from(resultSet);
    }
}