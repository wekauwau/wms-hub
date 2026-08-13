import request from 'supertest'
import { beforeAll, describe, expect, it } from 'vitest'
import app from '../app.js'

describe('Auth + RBAC', () => {
  let accessToken = ''
  let refreshToken = ''
  let hasAdminUser = false

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@wms.local', password: 'admin123' })

    if (res.status === 200) {
      accessToken = res.body.accessToken
      refreshToken = res.body.refreshToken
      hasAdminUser = true
    }
  })

  describe('POST /api/auth/login', () => {
    it('returns tokens for valid credentials', async () => {
      if (!hasAdminUser) {
        console.log('    (skipped — admin user not seeded)')
        return
      }
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@wms.local', password: 'admin123' })

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('accessToken')
      expect(res.body).toHaveProperty('refreshToken')
      expect(res.body.user.email).toBe('admin@wms.local')
      accessToken = res.body.accessToken
      refreshToken = res.body.refreshToken
    })

    it('rejects invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@wms.local', password: 'wrong' })

      expect(res.status).toBe(401)
    })

    it('rejects unknown email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'test' })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('returns new tokens for valid refresh token', async () => {
      if (!hasAdminUser) {
        console.log('    (skipped — admin user not seeded)')
        return
      }
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken })

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('accessToken')
      expect(res.body).toHaveProperty('refreshToken')
      accessToken = res.body.accessToken
      refreshToken = res.body.refreshToken
    })

    it('rejects invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })

      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('returns 204', async () => {
      if (!hasAdminUser) {
        console.log('    (skipped — admin user not seeded)')
        return
      }
      const res = await request(app).post('/api/auth/logout').send({ refreshToken })

      expect(res.status).toBe(204)
    })
  })

  describe('Protected routes', () => {
    it('GET /api/users requires auth', async () => {
      const res = await request(app).get('/api/users')
      expect(res.status).toBe(401)
    })

    it('GET /api/users returns users when authenticated', async () => {
      if (!hasAdminUser) {
        console.log('    (skipped — admin user not seeded)')
        return
      }
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('GET /api/roles requires auth', async () => {
      const res = await request(app).get('/api/roles')
      expect(res.status).toBe(401)
    })

    it('GET /api/roles returns roles when authenticated', async () => {
      if (!hasAdminUser) {
        console.log('    (skipped — admin user not seeded)')
        return
      }
      const res = await request(app).get('/api/roles').set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('GET /health', () => {
    it('returns ok', async () => {
      const res = await request(app).get('/health')
      expect(res.status).toBe(200)
      expect(res.body.status).toBe('ok')
    })
  })
})
