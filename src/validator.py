import * as yaml from 'js-yaml';

/**
 * Validates the syntax of a YAML string and optionally performs a structural load test.
 */
export class YamlValidator {
    /**
     * Checks if the provided string is valid YAML.
     * @param content The YAML string to validate.
     * @returns An object containing the validation state and error details if applicable.
     */
    public static validate(content: string): { isValid: boolean; error: string | null; data?: any } {
        if (!content || content.trim() === '') {
            return {
                isValid: false,
                error: 'Content is empty'
            };
        }

        try {
            const data = yaml.load(content);
            return {
                isValid: true,
                error: null,
                data
            };
        } catch (error: any) {
            let errorMessage = 'Invalid YAML syntax';
            
            if (error.mark) {
                errorMessage = `YAML Syntax Error at line ${error.mark.line + 1}, column ${error.mark.column + 1}: ${error.reason}`;
            } else if (error.message) {
                errorMessage = error.message;
            }

            return {
                isValid: false,
                error: errorMessage
            };
        }
    }

    /**
     * Performs a load test to ensure the YAML can be parsed and matches a basic schema structure.
     * @param content The YAML string to test.
     * @param requiredFields Optional list of top-level keys that must exist.
     */
    public static loadTest(content: string, requiredFields: string[] = []): { success: boolean; message: string } {
        const result = this.validate(content);

        if (!result.isValid) {
            return {
                success: false,
                message: `Load test failed: ${result.error}`
            };
        }

        const data = result.data;

        if (requiredFields.length > 0) {
            if (typeof data !== 'object' || data === null || Array.isArray(data)) {
                return {
                    success: false,
                    message: 'Load test failed: Schema requires a root mapping (object)'
                };
            }

            for (const field of requiredFields) {
                if (!(field in data)) {
                    return {
                        success: false,
                        message: `Load test failed: Missing required field "${field}"`
                    };
                }
            }
        }

        return {
            success: true,
            message: 'Load test passed: Syntax and structure are valid'
        };
    }
}

/**
 * Wrapper function for direct file-save validation logic.
 */
export function canSaveYaml(content: string, schemaRequirement: string[] = []): boolean {
    const testResult = YamlValidator.loadTest(content, schemaRequirement);
    if (!testResult.success) {
        console.error(testResult.message);
        return false;
    }
    return true;
}