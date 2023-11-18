import { PrismaClient } from "@prisma/client";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { email, password } = req.body;
      console.log("Received login request:", { email, password });

      const user = await prisma.user.findUnique({
        where: {
          email
        }
      });

      if (!user) {
        console.log("User not found for email:", email);
        return res.status(400).json({ error: "Invalid credentials. User not found." });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      console.log("Password match:", passwordMatch);

      if (!passwordMatch) {
        console.log("Password does not match for user:", user);
        return res.status(400).json({ error: "Invalid credentials. Password does not match." });
      }

      const token = jwt.sign({
        userId: user.id,
      }, process.env.JWT_SECRET);
      res.json({ token });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(400).json({ error: "Invalid credentials. An error occurred during login." });
    }
  }
}
