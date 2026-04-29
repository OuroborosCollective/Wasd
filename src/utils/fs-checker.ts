import * as fs from 'fs';
import * as path from 'path';

export function verifyCaseSensitivePath(targetPath: string): boolean {
    const absolutePath = path.resolve(targetPath);
    const root = path.parse(absolutePath).root;
    let currentPath = root;
    const relativeSegments = absolutePath.substring(root.length).split(path.sep).filter(s => s.length > 0);

    for (const segment of relativeSegments) {
        try {
            const entries = fs.readdirSync(currentPath);
            if (!entries.includes(segment)) {
                return false;
            }
            currentPath = path.join(currentPath, segment);
        } catch (error) {
            return false;
        }
    }
    return fs.existsSync(absolutePath);
}

export function isPnpmSymlinkValid(pkgPath: string): boolean {
    try {
        const stats = fs.lstatSync(pkgPath);
        if (stats.isSymbolicLink()) {
            const realPath = fs.realpathSync(pkgPath);
            return fs.existsSync(realPath);
        }
        return fs.existsSync(pkgPath);
    } catch (error) {
        return false;
    }
}