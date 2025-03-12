const jwt=require("jsonwebtoken")

const userAuth=(token)=>{
    let isAuth;
    if(!token|| !token.uuid) return null
    try{
    isAuth=jwt.verify(token.uuid,process.env.USERSECRET);
    }
    catch(err){
        isAuth=null;
    }
    return isAuth?isAuth.url?{username:isAuth.username,url:isAuth.url}:{username:isAuth.username}:null;
}

module.exports={userAuth}