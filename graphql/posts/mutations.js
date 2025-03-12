const mutations=`#graphql

createPost(title:String!,content:String!,filePath:String!,fileType:String!):String!
deletePost(id:String!):String!
updateVote(postId:String!,vote:Int!):String!
`

module.exports={mutations}