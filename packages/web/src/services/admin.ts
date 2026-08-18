import { api } from './api'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  status: string
  roles: string[]
  createdAt: string
}

export interface CreateUserInput {
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface UpdateUserInput {
  email?: string
  password?: string
  firstName?: string
  lastName?: string
  status?: string
}

export interface Permission {
  id: string
  name: string
}

export interface Role {
  id: string
  name: string
  description: string | null
  permissions: Permission[]
  createdAt: string
}

export interface CreateRoleInput {
  name: string
  description?: string
}

export interface UpdateRoleInput {
  name?: string
  description?: string
}

export const adminApi = {
  listUsers: () => api.get<User[]>('/users'),

  getUser: (id: string) => api.get<User>(`/users/${id}`),

  createUser: (input: CreateUserInput) => api.post<User>('/users', input),

  updateUser: (id: string, input: UpdateUserInput) => api.put<User>(`/users/${id}`, input),

  deleteUser: (id: string) => api.delete<void>(`/users/${id}`),

  listRoles: () => api.get<Role[]>('/roles'),

  getRole: (id: string) => api.get<Role>(`/roles/${id}`),

  createRole: (input: CreateRoleInput) => api.post<Role>('/roles', input),

  updateRole: (id: string, input: UpdateRoleInput) => api.put<Role>(`/roles/${id}`, input),

  deleteRole: (id: string) => api.delete<void>(`/roles/${id}`),

  listPermissions: () => api.get<Permission[]>('/roles/permissions'),

  assignPermissions: (id: string, permissionIds: string[]) =>
    api.post<Role>(`/roles/${id}/permissions`, { permissionIds }),
}
