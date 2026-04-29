export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
    type: IssueSeverity;
    path: string;
    line: number;
    message: string;
}

export interface TsConfigData {
    compilerOptions?: Record<string, any>;
    files?: string[];
    include?: string[];
    exclude?: string[];
    extends?: string | string[];
    references?: Array<{ path: string }>;
    [key: string]: any;
}