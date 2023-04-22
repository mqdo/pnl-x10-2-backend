const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer and Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'avatar',
    format: async (req, file) => 'png',
    public_id: (req, file) => `${Date.now()}-${file.originalname}`,
  },
});

exports.upload = multer({ storage, limits: { fileSize: 4000000 } });

const app = express();

const authRoute = require('./routes/auth.js');
const stageRoute = require("./routes/stagesR.js")
const projectRoute = require('./routes/projects.js');
const userRoute = require('./routes/users.js');
const { authenticate } = require('./middleware/auth.js');

app.use(cors({
  origin: '*'
}));

app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

// middleware and routes
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/auth', authRoute);
app.use('/stage', authenticate, stageRoute);
app.use('/user', authenticate, userRoute);
app.use('/project', authenticate, projectRoute);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: 'Error uploading image' });
  } else {
    return res.status(400).json({ message: 'Bad request' });
  }
});

module.exports = app;
