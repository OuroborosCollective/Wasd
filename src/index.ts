import * as fs from 'fs';
import * as path from 'path';

interface Document {
    toString(): string;
}

class Transformer {
    public static transform(content: string): Document {
        return {
            toString: () => content
        };
    }
}

function validate(doc: Document): boolean {
    return doc !== null && typeof doc === 'object' && typeof doc.toString === 'function';
}

function main(): void {
    const args = process.argv.slice(2);
    const fileName = args[0];

    if (!fileName) {
        process.stderr.write("Fehler: Kein Dateipfad angegeben.\n");
        process.exit(1);
    }

    const filePath = path.resolve(process.cwd(), fileName);

    if (!fs.existsSync(filePath)) {
        process.stderr.write(`Fehler: Datei nicht gefunden: ${filePath}\n`);
        process.exit(1);
    }

    try {
        const originalContent = fs.readFileSync(filePath, 'utf8');
        
        const doc = Transformer.transform(originalContent);

        if (!validate(doc)) {
            throw new Error("Validierung des Transformer-Ergebnisses fehlgeschlagen.");
        }

        const processedContent = doc.toString();

        fs.writeFileSync(filePath, processedContent, 'utf8');
        process.stdout.write(`Erfolgreich verarbeitet: ${filePath}\n`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Kritischer Fehler: ${message}\n`);
        process.exit(1);
    }
}

main();