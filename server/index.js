const app = require('./app/app.js');
const connectDB = require('./config/database.js');

async function startServer() {
  await connectDB();

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();