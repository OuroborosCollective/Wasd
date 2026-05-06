export class ConstraintValidator {
    public static validateConstraints(data: any, schema: any): string[] {
        const errors: string[] = [];
        schema.properties.forEach((prop: any) => {
            if (!prop.nullable && (data[prop.name] === undefined || data[prop.name] === null)) {
                errors.push(`Field ${prop.name} is non-nullable but received null/undefined`);
            }
        });
        return errors;
    }
}
