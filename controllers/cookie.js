const { redis, Driver } = require("../DB/connection");

const handleCookiedel=async(req,res)=>{
    try{
    const {room,user}=req.body;
    if(room){
        await Driver.executeQuery(`
            MATCH (p:person{username:$user})-[r:JOINED_BY]->(r:prvRoom{roomId:$room})
            DELETE r
            `,{user,room})
    }

    res.cookie('prvRoom','',{
        maxAge:0,
        httpOnly:true,
        secure:true,
        sameSite:'lax',
        domain:'.room-anchor.space',
    });
    }catch(err){
        console.log(err);
        
    }

    return res.status(403).send('kicked');
}

module.exports={handleCookiedel}