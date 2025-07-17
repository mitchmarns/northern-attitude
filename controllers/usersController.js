const bcrypt = require('bcryptjs');
const db = require('../config/database');

const UsersController = {
  // Show login form
  showLoginForm: (req, res) => {
    res.render('users/login', { title: 'Login', errors: [] });
  },

  // Handle login
  login: async (req, res) => {
    const { username, password } = req.body;
    try {
      // Profile query with EXPLAIN
      await db.query('EXPLAIN SELECT * FROM users WHERE username = ?', [username]);
      // Consider: CREATE INDEX idx_users_username ON users(username);
      const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
      if (!users.length) {
        return res.render('users/login', { title: 'Login', errors: ['Invalid username or password'], username });
      }
      const user = users[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.render('users/login', { title: 'Login', errors: ['Invalid username or password'], username });
      }
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin === 1
      };
      res.redirect('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      res.render('users/login', { title: 'Login', errors: ['Server error during login'], username });
    }
  },

  // Logout
  logout: (req, res) => {
    req.session.destroy(() => {
      res.redirect('/users/login');
    });
  },

  // Show register form
  showRegisterForm: (req, res) => {
    res.render('users/register', { title: 'Register', errors: [] });
  },

  // Handle registration
  register: async (req, res) => {
    const { username, email, password, password2 } = req.body;
    const errors = [];
    if (!username || !email || !password || !password2) errors.push('All fields are required');
    if (password !== password2) errors.push('Passwords do not match');
    if (password.length < 6) errors.push('Password must be at least 6 characters');
    if (errors.length > 0) {
      return res.render('users/register', { title: 'Register', errors, username, email });
    }
    try {
      const [existingUsers] = await db.query(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, email]
      );
      if (existingUsers.length > 0) {
        return res.render('users/register', { title: 'Register', errors: ['Username or email already in use'], username, email });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const [result] = await db.query(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
      );
      req.session.user = {
        id: result.insertId,
        username,
        email,
        isAdmin: false
      };
      res.redirect('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      res.render('users/register', { title: 'Register', errors: ['Server error during registration'], username, email });
    }
  }
};

module.exports = UsersController;
