let users = [];
let posts = [];

const db = {
  findUserByUsername: (username, callback) => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    callback(null, user);
  },

  searchUsers: (query, callback) => {
    const matched = users.filter(u => u.username.toLowerCase().includes(query.toLowerCase()));
    callback(null, matched);
  },

  insertUser: (userObj, callback) => {
    const existing = users.find(u => u.username.toLowerCase() === userObj.username.toLowerCase());
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
    const userPosts = posts.filter(p => p.username.toLowerCase() === username.toLowerCase()).reverse();
    callback(null, userPosts);
  },

  insertPost: (postObj, callback) => {
    const newPost = { 
      id: Date.now(), 
      ...postObj, 
      likes: [], // Array of usernames who liked
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
        post.likes.splice(index, 1); // Unlike
      } else {
        post.likes.push(username); // Like
      }
    }
    callback(null);
  },

  addComment: (postId, username, text, callback) => {
    const post = posts.find(p => p.id == postId);
    if (post) {
      post.comments.push({ username, text });
    }
    callback(null);
  },

  toggleFollow: (currentUsername, targetUsername, callback) => {
    const currentUser = users.find(u => u.username === currentUsername);
    const targetUser = users.find(u => u.username === targetUsername);

    if (currentUser && targetUser && currentUsername !== targetUsername) {
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
  }
};

module.exports = db;
