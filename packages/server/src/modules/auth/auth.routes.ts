import { Router } from 'express'
import { login, logout, refresh } from './auth.service.js'

const router = Router()

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    const result = await login(email, password)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    const result = await refresh(refreshToken)
    res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    await logout(refreshToken)
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
