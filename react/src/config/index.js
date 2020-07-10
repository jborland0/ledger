var env;

if (process.env.NODE_ENV === 'development') {
    env = require('./development');
} else {
    env = require('./production');
}

module.exports = env;