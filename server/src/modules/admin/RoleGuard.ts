export class RoleGuard {
  can(role: string, permission: string, matrix: Record<string, string[]>) {
    return (matrix[role] || []).includes(permission);
  }
}