const { mutations } = require("./mutations");
const { queries } = require("./queries");
const { resolvers } = require("./resolvers");
const { typeDefs } = require("./typedef");

const Post={typeDefs,queries,mutations,resolvers};

module.exports={Post}