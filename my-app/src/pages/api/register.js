import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { name, email, password } = req.body;
    const hashPassword = await bcrypt.hash(password, 10);
    try {
      const { password: passwordDB, ...user } = await prisma.user.create({
        data: {
          name,
          email,
          password: hashPassword
        }
      });
      res.status(201).json({ user });
    } catch (error) {
      res.status(400).json({ message: "User already exists" });
    }
  } else if (req.method === 'GET') {
    const users = await prisma.user.findMany();
    res.json({ users });
  }
}