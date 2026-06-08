const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../models');
const { redisClient } = require('../config/redis');

beforeAll(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
});

afterAll(async () => {
  await sequelize.close();
  await redisClient.quit();
});

describe('Auth API Tests', () => {

  test('POST /api/v1/auth/register - inscription réussie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        nom: 'Jest',
        prenom: 'Test',
        email: `jest_${Date.now()}@test.ma`,
        password: 'Test1234!',
        role: 'STUDENT',
      });

    console.log('Register response:', res.body);
    expect(res.statusCode).toBe(201);
  });

  test('POST /api/v1/auth/register - bloquer PROFESSOR', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        nom: 'Prof',
        prenom: 'Test',
        email: 'prof_test@test.ma',
        password: 'Test1234!',
        role: 'PROFESSOR',
      });

    expect(res.statusCode).toBe(403);
  });

  test('POST /api/v1/auth/login - connexion réussie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@bsts.ma',
        password: 'Test1234!',
      });

    console.log('Login response:', res.body);
    expect(res.statusCode).toBe(200);
  });

  test('POST /api/v1/auth/login - mauvais mot de passe', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@bsts.ma',
        password: 'MauvaisMotDePasse',
      });

    expect(res.statusCode).toBe(401);
  });

});