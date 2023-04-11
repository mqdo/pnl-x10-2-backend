const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

const authRoute = require('./routes/auth.js');
const stagesRoute = require("./routes/stagesR.js")

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
app.use('/stages', stagesRoute);
module.exports = app;
