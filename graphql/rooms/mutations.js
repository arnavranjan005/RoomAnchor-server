const mutations=`#graphql
    createRoom(password:String!,roomType:String!,roomSize:Int):String!
    joinRoom(roomId:String!,password:String!):String!
    destroyRoom:String!
    updateRoom(password:String!):String!
    createAndgetLink(expiration:Int):String
    leaveRoom(username:String):String!
`

module.exports={mutations}