const queries=`#graphql
    getImageKitAuth:ImageKitAuthResponse!
    getUserPosts(username:String!):[userpost!]
    getPost(id:String!,content:String,filePath:String,fileType:String,title:String,isVoted:String):userpost
    getAisuggestedPosts(after:String!):aisuggestpost!
    getPopularPosts(afterVotes:Int,ids:[String]):popularpost!
    getLatestPosts(after:String!):[userpost!]
    getAllPosts(limit:Int!,content:String,ids:[String]):[onlyPost!]
`

module.exports={queries}