// rateLimitMiddleware.js

const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each user to 5 requests per windowMs
  keyGenerator: (req) => req.body.userId, // Use userId as the key
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests, please try again later.",
      message: "You are blocked for 15 minutes due to excessive requests."
    });
  }
});

module.exports = limiter;