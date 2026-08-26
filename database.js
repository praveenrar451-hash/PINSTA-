const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, 'database.json');

function readDB() {
  try {
    if (!fs.existsSync(dbFile)) {
      const initialData = { users: [], posts: [], messages: [] };
      fs.writeFileSync(dbFile, JSON.stringify(initialData, null, 2));
      return initialData;
    }
    const data = fs.readFileSync(dbFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { users: [], posts: [], messages: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Write error:", err);
  }
}

const database = {
  findUserByUsername: (username, callback) => {
    const db = readDB();
    const user = db.users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
    callback(null, user || null);
  },

  searchUsers: (query, callback) => {
    const db = readDB();
    const users = db.users.filter(u => u.username && u.username.toLowerCase().includes(query.toLowerCase()));
    callback(null, users);
  },

  insertUser: (userObj, callback) => {
    const db = readDB();
    const newUser = {
      id: db.users.length > 0 ? db.users[db.users.length - 1].id + 1 : 1,
      username: userObj.username,
      email_or_phone: userObj.email_or_phone,
      password: userObj.password,
      followers: [],
      following: []
    };
    db.users.push(newUser);
    writeDB(db);
    callback(null, { lastID: newUser.id });
  },

  getAllPosts: (callback) => {
    const db = readDB();
    const posts = [...db.posts].reverse();
    callback(null, posts);
  },

  getPostsByUsername: (username, callback) => {
    const db = readDB();
    const posts = db.posts.filter(p => p.username && p.username.toLowerCase() === username.toLowerCase()).reverse();
    callback(null, posts);
  },

  insertPost: (postObj, callback) => {
    const db = readDB();
    const newPost = {
      id: db.posts.length > 0 ? db.posts[db.posts.length - 1].id + 1 : 1,
      user_id: postObj.user_id,
      username: postObj.username,
      content: postObj.content,
      image_url: postObj.image_url,
      likes: [],
      comments: [],
      created_at: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
    };
    db.posts.push(newPost);
    writeDB(db);
    callback(null);
  },

  toggleLikePost: (postId, username, callback) => {
    const db = readDB();
    const post = db.posts.find(p => p.id == postId);
    if (post) {
      if (!post.likes) post.likes = [];
      const index = post.likes.indexOf(username);
      if (index > -1) {
        post.likes.splice(index, 1);
      } else {
        post.likes.push(username);
      }
      writeDB(db);
    }
    callback(null);
  },

  addComment: (postId, username, text, callback) => {
    const db = readDB();
    const post = db.posts.find(p => p.id == postId);
    if (post) {
      if (!post.comments) post.comments = [];
      post.comments.push({ username, text });
      writeDB(db);
    }
    callback(null);
  },

  toggleFollow: (currentUsername, targetUsername, callback) => {
    const db = readDB();
    const currentUser = db.users.find(u => u.username === currentUsername);
    const targetUser = db.users.find(u => u.username === targetUsername);

    if (currentUser && targetUser && currentUsername !== targetUsername) {
      if (!currentUser.following) currentUser.following = [];
      if (!targetUser.followers) targetUser.followers = [];

      const isFollowing = currentUser.following.includes(targetUsername);
      if (isFollowing) {
        currentUser.following = currentUser.following.filter(u => u !== targetUsername);
        targetUser.followers = targetUser.followers.filter(u => u !== currentUsername);
      } else {
        currentUser.following.push(targetUsername);
        targetUser.followers.push(currentUsername);
      }
      writeDB(db);
    }
    callback(null);
  },

  sendMessage: (sender, receiver, text, callback) => {
    const db = readDB();
    const newMessage = {
      id: db.messages.length > 0 ? db.messages[db.messages.length - 1].id + 1 : 1,
      sender,
      receiver,
      text,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    db.messages.push(newMessage);
    writeDB(db);
    callback(null, newMessage);
  },

  getChatHistory: (user1, user2, callback) => {
    const db = readDB();
    const history = db.messages.filter(m => 
      (m.sender === user1 && m.receiver === user2) || 
      (m.sender === user2 && m.receiver === user1)
    );
    callback(null, history);
  },

  getChatsList: (username, callback) => {
    const db = readDB();
    const user = db.users.find(u => u.username === username);
    if (!user) return callback(null, []);

    const following = user.following || [];
    const followers = user.followers || [];
    const connectedUsernames = [...new Set([...following, ...followers])];

    const chatUsers = db.users.filter(u => connectedUsernames.includes(u.username));
    callback(null, chatUsers);
  }
};

module.exports = database;
