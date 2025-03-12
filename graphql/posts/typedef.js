const typeDefs = `#graphql
    type ImageKitAuthResponse {
        token: String!
        expire: Int!
        signature: String!
    }

    type userpost {
        id: String!
        title: String!
        content: String!
        filePath: String!
        fileType: String!
        upvotes: Int!
        downvotes: Int!
        isUpvoted: Boolean
        isDownvoted: Boolean
        createdAt: String!
        user:User
    }

    type onlyPost {
        id: String!
        title: String!
        content: String!
        filePath: String!
        fileType: String!
        createdAt: String!
        user:User
    }

    type aisuggestpost {
        aiPostedges:[aiPostedge]!
        aipageInfo:aipageinfo!
    }

    type aiPostedge {
        cursor:String!
        node:onlyPost!
    }

    type aipageinfo {
        endCursor:String
        hasNextPage:Boolean!
    }

    type popularpost {
        popularpostEdges:[popularpostedge!]!
        popularpageInfo:popularpageinfo
    }

    type popularpostedge {
        cursor:Int!
        node:userpost!
    }

    type popularpageinfo {
        endCursor:Int
        hasNextPage:Boolean!
    }
`

module.exports = { typeDefs }