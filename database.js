// Local In-Memory Storage Containers
let users = [];
let posts = [];

const db = {
  // 1. User search by username
  findUserByUsername: (username, callback) => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    callback(null, user);
  },

  // 2. Dynamic search API for users
  searchUsers: (query, callback) => {
    const matched = users.filter(u => u.username.toLowerCase().includes(query.toLowerCase()));
    callback(null, matched);
  },

  // 3. New User Registration
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

  // 4. Get all posts (Latest post first)
  getAllPosts: (callback) => {
    const sortedPosts = [...posts].reverse();
    callback(null, sortedPosts);
  },

  // 5. Get posts of a specific user
  getPostsByUsername: (username, callback) => {
    const userPosts = posts.filter(p => p.username.toLowerCase() === username.toLowerCase()).reverse();
    callback(null, userPosts);
  },

  // 6. Create new post
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

  // 7. Toggle Like / Unlike
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

  // 8. Add comment to post
  addComment: (postId, username, text, callback) => {
    const post = posts.find(p => p.id == postId);
    if (post) {
      if (!post.comments) post.comments = [];
      post.comments.push({ username, text });
    }
    callback(null);
  },

  // 9. Follow / Unfollow Toggle logic
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
