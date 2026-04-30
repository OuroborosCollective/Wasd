export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST'
}

export enum RequestStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  metadata?: Record<string, unknown>;
  createdAt: string | Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  statusCode: number;
}

export type EntityId = string | number;

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  totalCount: number;
  page: number;
  limit: number;
}

export const API_VERSION = 'v1';

export function isApiResponse<T>(obj: any): obj is ApiResponse<T> {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    typeof obj.success === 'boolean' &&
    typeof obj.statusCode === 'number'
  );
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

export const enum AuthEvent {
  LOGIN = 'AUTH_LOGIN',
  LOGOUT = 'AUTH_LOGOUT',
  REFRESH = 'AUTH_REFRESH'
}