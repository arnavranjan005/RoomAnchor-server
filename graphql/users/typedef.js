const typeDefs=`#graphql
    type User {
        url:String
        username:String!
    }

    type checkUser_Room {
        username:String!
        url:String
        roomId:String
        roomType:String
        token:String
    }

    type Connection {
        edges:[Edge]
        pageInfo:PageInfo
    }

    type getSearchedUsers{
        edges: [searchedUseredege]
        pageInfo:searchedUserpageInfo
    }

    type searchedUseredege{
        cursor:Int!
        node:getPopularUsers
    }

    type searchedUserpageInfo{
        hasNextPage:Boolean!
        endCursor:Int!
    }

    type getMetualFollowers {
        MutualFollowers:User
    }

    type getPopularUsers{
        username:String!
        url:String
        bio:String
        websites:[String]
        followersCount:Int!
        followingCount:Int!
    }

    type Edge{
        cursor:Int!
        node:User
    }

    type PageInfo{
        hasNextPage:Boolean!
        endCursor:Int!
    }

    type Useraccount{
        User:getPopularUsers
        Room:Room
    }

    type edituser{
        email:String
        bio:String
        websites:[String]
        emailChanged:String
        bioChanged:String
        websitesChanged:String
    }
`;

module.exports={typeDefs}