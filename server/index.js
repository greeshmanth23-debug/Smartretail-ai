import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import userRoutes from './routes/userroutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(userRoutes);

mongoose
  .connect('mongodb://localhost:27017/smartretail-ai')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.log('Error connecting to MongoDB', err);
  });

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
