import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: false });

const workflowSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    on: {
      oneOf: [
        { type: 'string' },
        { type: 'array', items: { type: 'string' } },
        { type: 'object' }
      ]
    },
    jobs: {
      type: 'object',
      minProperties: 1,
      additionalProperties: {
        type: 'object',
        properties: {
          'runs-on': { type: 'string' },
          steps: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                uses: { type: 'string' },
                run: { type: 'string' },
                with: { type: 'object' },
                env: { type: 'object' }
              },
              anyOf: [
                { required: ['uses'] },
                { required: ['run'] }
              ]
            }
          }
        },
        required: ['runs-on', 'steps']
      }
    }
  },
  required: ['on', 'jobs']
};

export interface ValidationResult {
  valid: boolean;
  errors?: any[] | null;
}

/**
 * Validiert ein Objekt gegen ein vereinfachtes GitHub Actions Workflow Schema.
 * @param data Das zu prüfende JSON-Objekt.
 * @returns Ein ValidationResult-Objekt mit dem Status und möglichen Fehlern.
 */
export function validateWorkflow(data: unknown): ValidationResult {
  const validate = ajv.compile(workflowSchema);
  const valid = validate(data);
  
  return {
    valid: !!valid,
    errors: validate.errors || null
  };
}