const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { routerimmersity } = require('./routes/immersity.routes');
const bodyParser = require('body-parser');
const path = require('path');
const { routergpt } = require('./routes/ai.routes');
const { routerLeonardo } = require('./routes/leonardo.routes');
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



app.use('/api',routergpt)
app.use('/immersity', routerimmersity);
app.use('/leonardo', routerLeonardo);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
