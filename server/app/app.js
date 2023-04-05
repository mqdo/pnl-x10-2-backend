const express = require('express');
require('dotenv').config();

const app = express();

// middleware and routes
app.get('/', (req, res) => {
  res.send('Hello World!');
})

module.exports = app;
