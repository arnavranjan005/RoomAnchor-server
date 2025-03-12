const { mutations } = require("./mutations");
const { resolvers } = require("./resolvers");
const { typeDefs } = require("./typedef");
const {queries}=require('./queries');

const Payment={typeDefs,mutations,resolvers,queries};

module.exports={Payment}