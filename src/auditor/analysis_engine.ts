import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

export interface AnalysisResult {
    file: string;
    diagnostics: ts.Diagnostic[];
    inconsistencies: string[];
}

export class AnalysisEngine {
    private program: ts.Program;
    private checker: ts.TypeChecker;
    private options: ts.CompilerOptions;

    constructor(fileNames: string[], options?: ts.CompilerOptions) {
        this.options = options || {
            target: ts.ScriptTarget.ESNext,
            module: ts.ModuleKind.CommonJS,
            allowJs: true,
            checkJs: true,
            strict: true,
            noUnusedLocals: true,
            noUnusedParameters: true
        };
        this.program = ts.createProgram(fileNames, this.options);
        this.checker = this.program.getTypeChecker();
    }

    public runFullAnalysis(): AnalysisResult[] {
        return this.program.getSourceFiles()
            .filter(sf => !sf.isDeclarationFile)
            .map(sf => ({
                file: sf.fileName,
                diagnostics: this.getDiagnostics(sf),
                inconsistencies: this.findLogicalInconsistencies(sf)
            }));
    }

    private getDiagnostics(sourceFile: ts.SourceFile): ts.Diagnostic[] {
        return [
            ...this.program.getSyntacticDiagnostics(sourceFile),
            ...this.program.getSemanticDiagnostics(sourceFile)
        ];
    }

    private findLogicalInconsistencies(sourceFile: ts.SourceFile): string[] {
        const issues: string[] = [];
        const visit = (node: ts.Node) => {
            if (ts.isBinaryExpression(node)) {
                if (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken || 
                    node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken) {
                    const leftType = this.checker.getTypeAtLocation(node.left);
                    const rightType = this.checker.getTypeAtLocation(node.right);
                    
                    if (!(leftType.getFlags() & rightType.getFlags()) && 
                        leftType.getFlags() !== ts.TypeFlags.Any && 
                        rightType.getFlags() !== ts.TypeFlags.Any) {
                        issues.push(`Inconsistent comparison: Types ${this.checker.typeToString(leftType)} and ${this.checker.typeToString(rightType)} have no overlap.`);
                    }
                }
            }

            if (ts.isIfStatement(node)) {
                const conditionType = this.checker.getTypeAtLocation(node.expression);
                if (conditionType.getFlags() & ts.TypeFlags.BooleanLiteral) {
                    issues.push(`Constant condition detected in if-statement at ${node.getStart()}`);
                }
            }

            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return issues;
    }

    public applyFix(filePath: string): boolean {
        try {
            const absolutePath = path.resolve(filePath);
            const sourceFile = this.program.getSourceFile(absolutePath);

            if (!sourceFile) {
                return false;
            }

            const printer = ts.createPrinter({
                newLine: ts.NewLineKind.LineFeed,
                removeComments: false
            });

            const transformedSource = printer.printFile(sourceFile);
            fs.writeFileSync(absolutePath, transformedSource, "utf8");

            const updatedProgram = ts.createProgram([absolutePath], this.options);
            const newDiagnostics = updatedProgram.getSemanticDiagnostics();
            
            return newDiagnostics.length === 0;
        } catch (e) {
            return false;
        }
    }
}