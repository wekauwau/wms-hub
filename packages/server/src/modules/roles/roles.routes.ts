import { Router } from 'express'
import {
  assignPermissions,
  createRole,
  deleteRole,
  getRole,
  listRoles,
  updateRole,
} from './roles.service.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const roles = await listRoles()
    res.json(roles)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const role = await getRole(req.params.id)
    if (!role) {
      res.status(404).json({ error: 'Role not found' })
      return
    }
    res.json(role)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { name, description } = req.body
    const role = await createRole({ name, description })
    res.status(201).json(role)
  } catch (err) {
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const { name, description } = req.body
    const role = await updateRole(req.params.id, { name, description })
    if (!role) {
      res.status(404).json({ error: 'Role not found' })
      return
    }
    res.json(role)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await deleteRole(req.params.id)
    if (!deleted) {
      res.status(404).json({ error: 'Role not found' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.post('/:id/permissions', async (req, res, next) => {
  try {
    const { permissionIds } = req.body
    const role = await assignPermissions(req.params.id, permissionIds)
    if (!role) {
      res.status(404).json({ error: 'Role not found' })
      return
    }
    res.json(role)
  } catch (err) {
    next(err)
  }
})

export default router
