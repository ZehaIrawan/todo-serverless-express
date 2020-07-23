const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express');
const Todo = require('../models/Todo');
const User = require('../models/User')
const { check, validationResult } = require('express-validator');
const { connectDB, closeDB } = require('../config/db');
require('dotenv').config();
const auth = require('../middleware/auth');
const checkObjectId = require('../middleware/checkObjectId');

const app = express();
const router = express.Router();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create Todo
router.post(
  '/',
  auth,
  [check('title', 'Title is required').not().isEmpty()],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      connectDB()
       await User.findById(req.user.id).select('-password');

      const newTodo = new Todo({
        title: req.body.title,
        user: req.user.id,
      });

      const todo = await newTodo.save();

      res.json(todo);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    } finally{
      closeDB()
    }
  },
);

// Get Todo Belong to User
router.get('/', auth, async (req, res) => {
  try {
    connectDB();
    const todos = await Todo.find({ user: req.user.id }).sort({ date: -1 });
    res.json(todos);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  } finally {
    closeDB();
  }
});

// Delete Todo
router.delete('/:id', [auth, checkObjectId('id')], async (req, res) => {
  try {
    connectDB()
    const todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({ msg: 'Todo not found' });
    }

    // Check user
    if (todo.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await todo.remove();

    res.json({ msg: 'Todo removed' });
  } catch (err) {
    console.error(err.message);

    res.status(500).send('Server Error');
  }finally{
    closeDB()
  }
});

// Update todo
router.put(
  '/:id',
  [
    auth,
    checkObjectId('id'),
    [
      check('title', 'Title is required').not().isEmpty(),
      check('isCompleted', 'isCompleted is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      connectDB()
      const todo = await Todo.findById(req.params.id);

      if (!todo) {
        return res.status(404).json({ msg: 'Todo not found' });
      }
      // Check user
      if (todo.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
      }

      todo.title = req.body.title;
      todo.isCompleted = req.body.isCompleted;

      await todo.save();

      res.json({ msg: 'Todo Updated' });
    } catch (err) {
      console.error(err.message);

      res.status(500).send('Server Error');
    } finally{
      closeDB()
    }
  },
);



app.use('/.netlify/functions/todo', router); // path must route to lambda

module.exports = app;
module.exports.handler = serverless(app);
