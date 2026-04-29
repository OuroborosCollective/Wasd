const Ajv = require('ajv');
const addFormats = require('ajv-formats');

/**
 * Validates a JavaScript object against the GitHub Actions Workflow JSON schema.
 * @param {Object} data - The workflow object to validate.
 * @returns {Promise<boolean>} - Returns true if valid, throws error if invalid.
 */
async function validateGitHubWorkflow(data) {
    const ajv = new Ajv({ 
        allErrors: true, 
        strict: false,
        loadSchema: async (uri) => {
            const response = await fetch(uri);
            return await response.json();
        }
    });
    
    addFormats(ajv);

    const schemaUrl = 'https://json.schemastore.org/github-workflow.json';
    
    try {
        const response = await fetch(schemaUrl);
        if (!response.ok) {
            throw new Error(`Could not fetch schema from ${schemaUrl}: ${response.statusText}`);
        }
        const schema = await response.json();

        const validate = ajv.compile(schema);
        const valid = validate(data);

        if (!valid) {
            const errorDetails = validate.errors.map(err => {
                return {
                    path: err.instancePath,
                    message: err.message,
                    params: err.params,
                    data: err.data
                };
            });

            const errorMessage = errorDetails.map(e => 
                `Error at ${e.path || 'root'}: ${e.message} ${JSON.stringify(e.params)}`
            ).join('\n');

            const error = new Error('GitHub Action validation failed');
            error.details = errorDetails;
            error.formattedMessage = errorMessage;
            throw error;
        }

        return true;
    } catch (err) {
        if (err.details) throw err;
        throw new Error(`Validation process failed: ${err.message}`);
    }
}

module.exports = {
    validateGitHubWorkflow
};