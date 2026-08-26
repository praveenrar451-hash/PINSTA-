const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: 'pinsta_super_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, secure: false }
}));

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) return next();
  res.redirect('/login');
};

app.get('/', (req, res) => {
  if (req.session && req.session.user) res.redirect('/feed');
  else res.redirect('/login');
});

app.get('/signup', (req, res) => res.render('signup', { error: null }));

app.post('/signup', async (req, res) => {
  const { username, email_or_phone, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.insertUser({ username, email_or_phone, password: hashedPassword }, (err, result) => {
      if (err) return res.render('signup', { error: 'Username already taken!' });
      req.session.user = { id: result.lastID, username: username };
      res.redirect('/feed');
    });
  } catch (err) {
    res.render('signup', { error: 'Something went wrong!' });
  }
});

app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.findUserByUsername(username, async (err, user) => {
    if (err || !user) return res.render('login', { error: 'Invalid username or password!' });
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      req.session.user = { id: user.id, username: user.username };
      res.redirect('/feed');
    } else {
      res.render('login', { error: 'Invalid username or password!' });
    }
  });
});

app.get('/feed', isAuthenticated, (req, res) => {
  db.getAllPosts((err, posts) => {
    res.render('feed', { user: req.session.user, posts: posts || [] });
  });
});

app.get('/search', isAuthenticated, (req, res) => {
  const query = req.query.q || '';
  db.searchUsers(query, (err, users) => {
    res.json(users || []);
  });
});

app.get('/profile/:username', isAuthenticated, (req, res) => {
  const profileUsername = req.params.username;
  db.findUserByUsername(profileUsername, (err, targetUser) => {
    if (!targetUser) return res.redirect('/feed');
    db.getPostsByUsername(profileUsername, (err, userPosts) => {
      res.render('profile', { 
        loggedInUser: req.session.user, 
        profileUser: targetUser, 
        posts: userPosts || [] 
      });
    });
  });
});

app.post('/follow/:username', isAuthenticated, (req, res) => {
  db.toggleFollow(req.session.user.username, req.params.username, () => {
    res.redirect('/profile/' + req.params.username);
  });
});

app.post('/post', isAuthenticated, upload.single('image'), (req, res) => {
  const { content } = req.body;
  if (!req.session.user) return res.redirect('/login');
  let imagePath = req.file ? '/uploads/' + req.file.filename : null;

  db.insertPost({ user_id: req.session.user.id, username: req.session.user.username, content: content || '', image_url: imagePath }, () => {
    res.redirect('/feed');
  });
});

app.post('/like/:id', isAuthenticated, (req, res) => {
  db.toggleLikePost(req.params.id, req.session.user.username, () => res.redirect('back'));
});

app.post('/comment/:id', isAuthenticated, (req, res) => {
  const { text } = req.body;
  if (text) {
    db.addComment(req.params.id, req.session.user.username, text, () => res.redirect('back'));
  } else {
    res.redirect('back');
  }
});

app.get('/chat', isAuthenticated, (req, res) => {
  res.render('chat', { user: req.session.user });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.listen(PORT, () => console.log(`PINSTA running on port ${PORT}`));
