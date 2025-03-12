const jwt=require("jsonwebtoken");

const setUser=(username,url)=>{
    const payload=url?{username,url}:{username};
    const token=jwt.sign(
        payload,
        process.env.USERSECRET,{
            expiresIn:"61d"
        }
    );
    return token;
}

const setRoom=(prvRoom,roomType,isCreater)=>{
    const payload=isCreater?{prvRoom,roomType,isCreater}:{prvRoom,roomType};
    const token=jwt.sign(
        payload,
        process.env.ROOMSECRET,{
            expiresIn:"75m"
        }
    );
    return token;
}

module.exports={setUser,setRoom}