import express from 'express';
import userModel from '../models/user.js';

const userRoutes = express.Router();


userRoutes.post('/signup', async (req, res) => {
    const { username, shopname, email, password } = req.body;
    const userid = new Date().getTime().toString(); 
    const newUser = new userModel({ userid, username, shopname, email, password });
    await newUser.save()
        .then(() => {
            res.status(201).json({ message: 'success' });
        })
        .catch((err) => {
            res.status(500).json({ message: 'Internal server error' });
        });
});

userRoutes.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(200).json({ message: 'notfound' });
        }

        if (user.password !== password) {
            return res.status(200).json({ message: 'invalidpassword' });
        }

        return res.status(200).json({ message: 'success' });
    } catch (error) {
        return res.status(500).json({ message: 'Internal server error' });
    }
});


export default userRoutes;