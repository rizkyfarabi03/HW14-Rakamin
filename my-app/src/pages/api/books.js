import multer from "multer";
import path from 'path';
import { PrismaClient } from "@prisma/client";
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'public/uploads'),
  filename: (req, file, cb) => {
    const fileName = file.originalname.toLowerCase().split(' ').join('-');
    cb(null, Date.now() + '-' + fileName);
  }
});

const upload = multer({ storage, limits: { fileSize: 10000000 } });

async function authenticateTokenMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = user.userId;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { id } = req.query;

    if (id) {
      const bookId = parseInt(id);

      try {
        const book = await prisma.book.findUnique({
          where: { id: bookId },
        });

        if (!book) {
          return res.status(404).json({ message: 'Book not found' });
        }

        return res.status(200).json(book);
      } catch (error) {
        console.error('Error fetching book:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }
    } else {
      const books = await prisma.book.findMany();
      return res.status(200).json(books);
    }
  } else if (req.method === 'POST') {
    authenticateTokenMiddleware(req, res, () => {
      upload.single('image')(req, res, async (err) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: 'Error uploading image' });
        }
        const { title, author, publisher, year, pages } = req.body;

        if (req.file) {
          const imageUrl = `/uploads/${req.file.filename}`;

          const newBook = await prisma.book.create({
            data: {
              title,
              author,
              publisher,
              year: parseInt(year),
              pages: parseInt(pages),
              image: imageUrl
            }
          });

          res.status(201).json(newBook);
        } else {
          res.status(400).json({ message: 'Image file is required' });
        }
      });
    });
  } else if (req.method === 'PUT') {
    authenticateTokenMiddleware(req, res, async () => {
      try {
        const { id } = req.params;
        const { title, author, publisher, year, pages } = req.body;

        const existingBook = await prisma.book.findUnique({
          where: { id: Number(id) },
        });

        if (!existingBook) {
          return res.status(404).json({ message: 'Book not found' });
        }

        const updatedBook = await prisma.book.update({
          where: { id: Number(id) },
          data: {
            title: title || existingBook.title,
            author: author || existingBook.author,
            publisher: publisher || existingBook.publisher,
            year: year || existingBook.year,
            pages: pages || existingBook.pages,
          },
        });
        res.json({ book: updatedBook });
      }
      catch (err) {
        console.log(err);
        res.status(400).json({ message: "Something went wrong" });
      }
    });
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}