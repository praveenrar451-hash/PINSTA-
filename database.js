let users = [];
let posts = [];
let messages = [];

const database = {
  findUserByUsername: (username, callback) => {
    const user = users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
    callback(null, user || null);
  },

  searchUsers: (query, callback) => {
    const matched = users.filter(u => u.username && u.username.toLowerCase().includes(query.toLowerCase()));
    callback(null, matched);
  },

  insertUser: (userObj, callback) => {
    const existing = users.find(u => u.username && u.username.toLowerCase() === userObj.username.toLowerCase());
    if (existing) {
      return callback(new Error('Username already taken'));
    }
    const newUser = { 
      id: Date.now(), 
      ...userObj, 
      followers: [], 
      following: [] 
    };
    users.push(newUser);
    callback(null, { lastID: newUser.id });
  },

  getAllPosts: (callback) => {
    const sortedPosts = [...posts].reverse();
    callback(null, sortedPosts);
  },

  getPostsByUsername: (username, callback) => {
    const userPosts = posts.filter(p => p.username && p.username.toLowerCase() === username.toLowerCase()).reverse();
    callback(null, userPosts);
  },

  insertPost: (postObj, callback) => {
    const newPost = { 
      id: Date.now(), 
      ...postObj, 
      likes: [], 
      comments: [],
      created_at: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString() 
    };
    posts.push(newPost);
    callback(null);
  },

  toggleLikePost: (postId, username, callback) => {
    const post = posts.find(p => p.id == postId);
    if (post) {
      if (!post.likes) post.likes = [];
      const index = post.likes.indexOf(username);
      if (index > -1) {
        post.likes.splice(index, 1);
      } else {
        post.likes.push(username);
      }
    }
    callback(null);
  },

  addComment: (postId, username, text, callback) => {
    const post = posts.find(p => p.id == postId);
    if (post) {
      if (!post.comments) post.comments = [];
      post.comments.push({ username, text });
    }
    callback(null);
  },

  toggleFollow: (currentUsername, targetUsername, callback) => {
    const currentUser = users.find(u => u.username === currentUsername);
    const targetUser = users.find(u => u.username === targetUsername);

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
    }
    callback(null);
  },

  sendMessage: (sender, receiver, text, callback) => {
    const newMessage = {
      id: Date.now(),
      sender,
      receiver,
      text,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    messages.push(newMessage);
    callback(null, newMessage);
  },

  getChatHistory: (user1, user2, callback) => {
    const chat = messages.filter(m => 
      (m.sender === user1 && m.receiver === user2) || 
      (m.sender === user2 && m.receiver === user1)
    );
    callback(null, chat);
  },

  getChatsList: (username, callback) => {
    const user = users.find(u => u.username === username);
    if (!user) return callback(null, []);

    const following = user.following || [];
    const followers = user.followers || [];
    const connectedUsernames = [...new Set([...following, ...followers])];
    const chatUsers = users.filter(u => connectedUsernames.includes(u.username));
    
    callback(null, chatUsers);
  }
};

module.exports = database;
