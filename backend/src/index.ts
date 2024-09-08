import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { decode, sign, verify } from 'hono/jwt'

const app = new Hono<{
  Bindings: {
    DATABASE_URL: string
    JWT_SECRET: string
  },
  Variables: {
    userId: string
  }
}>()

app.use('/api/v1/blog/*', async (c, next) => {
  try {
    const token = await c.req.header('Authorization')?.split(' ')[1];
    if (!token) {
      return c.json('Token Not Found');
    }
    const secret = c.env.JWT_SECRET;
    const payload = await verify(token, secret);
    if (!payload.id) {
      return c.json('Unauthorized');
    }
    c.set('userId', payload.id.toString());
    await next();
  }
  catch (e: any) {
    return c.json('Unauthorized');
  }
})

app.post('/api/v1/user/signup', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  try {
    const body = await c.req.json();

    const userExists = await prisma.user.findUnique({
      where: {
        email: body.email,
      },
    })
    if (userExists) {
      return c.json('User already exists');
    }
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: body.password,
      },
    })

    const secret = c.env.JWT_SECRET;
    const token = await sign({ id: user.id }, secret);
    console.log(token)
    return c.json({ user, token });
  }
  catch (e: any) {
    return c.text(e.message);
  }
})

app.post('/api/v1/user/signin', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  try {
    const body = await c.req.json();
    const secret = c.env.JWT_SECRET;

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      return c.json('User not found');
    }
    if (user.password !== body.password) {
      return c.json('Invalid password');
    }
    const token = await sign({ id: user.id }, secret);
    return c.json({ user, token });

  }
  catch (e: any) {
    return c.text(e.message);
  }
})

app.post('/api/v1/blog', (c) => {
  return c.json({ message: `Authorized User Blog` })
})

app.put('/api/v1/blog', (c) => {
  return c.json({ message: 'User signin' })
})

app.get('/api/v1/blog/:id', (c) => {
  return c.json({ message: 'User signin' })
})

app.get('/api/v1/blog/bulk', (c) => {
  return c.json({ message: 'User signin' })
})

export default app
