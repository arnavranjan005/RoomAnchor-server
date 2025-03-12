const queries=`#graphql
    getAllUsers(username:String!):[User!]
    getFollowreq(username:String!):String!
    getFollowing(after:Int,username:String!):Connection!
    getMetualFollowers(username:String!):[getMetualFollowers]
    getFollowers(after:Int,username:String!):Connection!
    getPopularUsers:[getPopularUsers]
    getSuggestionUsers(after:Int):Connection!
    getUseraccount(username:String!):Useraccount
    getSearchUsers(username:String!,after:Int):getSearchedUsers!
    getUserfollowsent:[String!]!
    getUserfollowrecv:[String!]!
`

module.exports={queries}