const typeDefs = `#graphql
    type Room {
        roomId:String!
        roomType:String!
        roomSize:Int
        totalJoined:Int!
    }

    type ConnectionRoomPagination {
        edges: [ConnectionRoomEdge!]!
        pageInfo: RoompageInfo
    }

    type ConnectionRoomEdge {
        cursor: String!
        node: Room!
    }

    type RoompageInfo {
        hasNextPage: Boolean!
        endCursor: String
    }
`

module.exports = { typeDefs }