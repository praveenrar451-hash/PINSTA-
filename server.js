const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  try { fs.mkdirSync(uploadDir, { recursive: true }); } catch(e) {}
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: 'pinsta_secure_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000, secure: false }
}));

// Safe Database Fallback (Agar database.js me koi error ho toh yeh handle kar lega)
let db;
try {
  db = require('./database');
} catch (e) {
  db = {
    findUserByUsername: (u, cb) => cb(null, null),
    searchUsers: (q, cb) => cb(null, []),
    insertUser: (o, cb) => cb(null, { lastID: 1 }),
    getAllPosts: (cb) => cb(null, []),
    getPostsByUsername: (u, cb) => cb(null, []),
    insertPost: (o, cb) => cb(null),
    toggleLikePost: (id, u, cb) => cb(null),
    addComment: (id, u, t, cb) => cb(null),
    toggleFollow: (c, t, cb) => cb(null),
    sendMessage: (s, r, t, cb) => cb(null, { sender: s, receiver: r, text: t }),
    getChatHistory: (u1, u2, cb) => cb(null, []),
    getChatsList: (u, cb) => cb(null, [])
  };
}

const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) return next();
  res.redirect('/login');
};

app.get('/', (req, res) => {
  if (req.session && req.session.user) res.redirect('/feed');
  else res.redirect('/login');
});

app.get('/signup', (req, res) => {
  try { res.render('signup', { error: null }); } catch(e) { res.send("Signup view error"); }
});

app.post('/signup', async (req, res) => {
  const { username, email_or_phone, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password || '123456', 10);
    db.insertUser({ username, email_or_phone, password: hashedPassword }, (err, result) => {
      if (err) return res.render('signup', { error: 'Username already taken!' });
      req.session.user = { id: result ? result.lastID : 1, username: username };
      res.redirect('/feed');
    });
  } catch (err) {
    res.redirect('/signup');
  }
});

app.get('/login', (req, res) => {
  try { res.render('login', { error: null }); } catch(e) { res.send("Login view error"); }
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.findUserByUsername(username, async (err, user) => {
    if (err || !user) return res.render('login', { error: 'Invalid username or password!' });
    try {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        req.session.user = { id: user.id, username: user.username };
        res.redirect('/feed');
      } else {
        res.render('login', { error: 'Invalid username or password!' });
      }
    } catch(e) {
      res.render('login', { error: 'Something went wrong!' });
    }
  });
});

app.get('/feed', isAuthenticated, (req, res) => {
  db.getAllPosts((err, posts) => {
    try {
      res.render('feed', { user: req.session.user, posts: posts || [] });
    } catch(e) {
      res.send("Feed template error");
    }
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
      try {
        res.render('profile', { 
          loggedInUser: req.session.user, 
          profileUser: targetUser, 
          posts: userPosts || [] 
        });
      } catch(e) {
        res.redirect('/feed');
      }
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
  db.getChatsList(req.session.user.username, (err, chatUsers) => {
    try {
      res.render('chat', { 
        user: req.session.user, 
        chatUsers: chatUsers || [], 
        activeChatUser: null, 
        messages: [] 
      });
    } catch(e) {
      res.send("Chat view missing or error");
    }
  });
});

app.get('/chat/:username', isAuthenticated, (req, res) => {
  const targetUsername = req.params.username;
  db.getChatsList(req.session.user.username, (err, chatUsers) => {
    db.getChatHistory(req.session.user.username, targetUsername, (err, history) => {
      try {
        res.render('chat', { 
          user: req.session.user, 
          chatUsers: chatUsers || [], 
          activeChatUser: targetUsername, 
          messages: history || [] 
        });
      } catch(e) {
        res.redirect('/chat');
      }
    });
  });
});

app.post('/chat/:username', isAuthenticated, (req, res) => {
  const receiver = req.params.username;
  const { text } = req.body;
  if (!text) return res.redirect('/chat/' + receiver);
  db.sendMessage(req.session.user.username, receiver, text, () => {
    res.redirect('/chat/' + receiver);
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
