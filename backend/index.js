import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import connectDb from './config/db.js';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes.js';
import cors from "cors";
import userRouter from './routes/user.routes.js';

const app = express();
const PORT = process.env.PORT  || 3000;
app.use(cors({
  origin:"http://localhost:5173",
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())
app.use("/api/auth" , authRouter);
app.use("/api/auth", userRouter)

app.listen(PORT, () => {
    connectDb()
    console.log(`Server is running on port ${PORT}`);
});


