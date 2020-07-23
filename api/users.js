const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express');
const User = require('../models/User');
const { connectDB, closeDB } = require('../config/db');
const auth = require('../middleware/auth');

const app = express();
const router = express.Router();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Get User Data

router.get('/', auth, async (req, res) => {
  try {
    connectDB();
    let user = await User.findById(req.user.id).select([
      '-password',
      '-date',
      '-__v',
    ]);

    if (!user) {
      return res.status(400).json({ msg: 'User not found' });
    }

    res.send(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  } finally {
    closeDB();
  }
});

app.use('/.netlify/functions/users', router); // path must route to lambda

module.exports = app;
module.exports.handler = serverless(app);
