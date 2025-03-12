const { mutations } = require("./mutations");
const { queries } = require("./queries");
const { resolvers } = require("./resolvers");
const { typeDefs } = require("./typedef");

const Room={typeDefs,queries,mutations,resolvers};

module.exports={Room}