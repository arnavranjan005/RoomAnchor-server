const jwt=require("jsonwebtoken")

const roomAuth=(token)=>{
    let isAuth;
    if(!token || !token.prvRoom) return null
    try{
    isAuth=jwt.verify(token.prvRoom,process.env.ROOMSECRET);
    }
    catch(err){
        isAuth=null;
    }
    
    return isAuth?isAuth.isCreater?{prvRoom:isAuth.prvRoom,roomType:isAuth.roomType,isCreater:isAuth.isCreater}:{prvRoom:isAuth.prvRoom,roomType:isAuth.roomType}:null;
}

module.exports={roomAuth}