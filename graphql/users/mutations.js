const mutations=`#graphql
    createUser(username:String!, email:String!, password:String!,bio:String,websites:[String]): String!
    loginUser(username:String!, password:String!,token:String):String!
    checkUser_Room(q:String,r:String,t:String):checkUser_Room!
    followReq(username:String!):String!
    acceptReq(username:String!):String!
    rejectFollowreq(username:String!):String!
    disconnect(username:String!):String!
    unfollow(username:String!):String!
    cancelFollowreq(username:String!):String!
    editUser(email:String,currentPassword:String,newPassword:String,bio:String,websites:[String]):edituser!
    forgotPasslink(email:String,newPassword:String,link:String):String!
    DeleteAccount: String!
`;

module.exports={mutations};