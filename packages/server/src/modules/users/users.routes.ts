import { Router } from 'express'
import { createUser, deleteUser, getUser, listUsers, updateUser } from './users.service.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const users = await listUsers()
    res.json(users)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const user = await getUser(req.params.id)
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json(user)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body
    const user = await createUser({ email, password, firstName, lastName })
    res.status(201).json(user)
  } catch (err) {
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, status } = req.body
    const user = await updateUser(req.params.id, { email, password, firstName, lastName, status })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json(user)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await deleteUser(req.params.id)
    if (!deleted) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
