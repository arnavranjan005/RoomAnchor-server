const bycrpt=require('bcryptjs')
const { Driver, redis } = require("../DB/connection");
const { setRoom } = require('../services/token/jwtToken');

const createRoom=async({password,roomType,roomSize},{res,User})=>{
    if(!User) throw new Error('user does not exist');
    if(await redis.hget(`Room:${User.username}:owner`,'owner')) throw new Error('room already exists');
    // if(roomType==='video' && (!roomSize ||!roomSize>=2)) throw new Error('room size must be greater than 2');
    if(roomType==='chat' && typeof(roomSize)!=='undefined') throw new Error('invalid input');
    try{
        // if(await redis.hget(`users:${User.username}`,'paid')==='pending') throw new Error('please wait for payment');
    // if(roomSize&&roomSize>5&&!await redis.hget(`users:${User.username}`,'paid')=='true') throw new Error('payment required');

   const pass= await bycrpt.hash(password,12);
   roomSize?await Driver.executeQuery(`
    CREATE (p:prvRoom{roomId:$roomId,password:$pass,roomType:$roomType,createdAt:datetime(),roomSize:$roomSize})
    WITH p
    MATCH (u:person{username:$roomId})
    MERGE (u)-[:CREATED_BY]->(p)
    `,{
        roomId:User.username,
        pass,
        roomType,
        roomSize
    }):
    await Driver.executeQuery(`
    CREATE (p:prvRoom{roomId:$roomId,password:$pass,roomType:$roomType,createdAt:datetime()})
    WITH p
    MATCH (u:person{username:$roomId})
    MERGE (u)-[:CREATED_BY]->(p)
    `,{
        roomId:User.username,
        pass,
        roomType
    });

    const token=setRoom(User.username,roomType,true);
    res.cookie('prvRoom',token,{
            httpOnly:true,
            secure:true,
            sameSite:'lax'
    })

    await redis.hset(`Room:${User.username}:owner`,'owner',User.username);
    await redis.del(User.username);
    await redis.hset(`users:${User.username}`,'room',`${User.username}_${roomType}`);
    if(roomType==='video'){
    await redis.hset(`Room:${User.username}:roomSize`,'roomSize',roomSize);
    await redis.hdel(`Room:${User.username}:roomType`,'roomType');
    }

    return JSON.stringify({
        username:User.username,
        data:'room created successfully'
    });
    
    }catch(err){
        console.log(err);
        if(err.message) throw new Error(err.message);
        throw new Error('room already exists');
    }
}

const joinRoom=async({roomId,password},{res,User})=>{
    try{
    if(!User) throw new Error('user does not exist');
    const isRoom=await redis.hget(`users:${roomId}`,'room');
    if(!isRoom) throw new Error('room does not exist');
    
    if(await redis.hget(`users:${User.username}`,`room`)) throw new Error('you are already in a room');
    
    const roomType=isRoom.split('_')[1];
    const room= await Driver.executeQuery(`
        MATCH (p:prvRoom{roomId:$roomId})
        RETURN p.password AS pass
        `,{
            roomId
        })
console.log(roomType);
    
    const pass= await bycrpt.compare(password,room.records[0].get('pass'));console.log(pass);
    
    if(!pass){
        throw new Error('invalid password');
    }
    await Driver.executeQuery(`
    MATCH (p:prvRoom{roomId:$roomId}),(u:person{username:$User})
    MERGE (u)-[:JOINED_BY]->(p)
    `,{
        roomId,
        User:User.username
    });

    await redis.hset(`users:${User.username}`,'room',isRoom);

    const token=setRoom(roomId,roomType);
    res.cookie('prvRoom',token,{
        httpOnly:true,
            secure:true,
            maxAge:1000*60*60,
            sameSite:'lax',
    })

    return JSON.stringify({msg:'room joined',roomType});
}
catch(err){
    if(err.message) throw new Error(err.message);
    throw new Error('room does not exist');
}
}

const destroyRoom=async({res,User,Room})=>{
    if(!User || !Room) throw new Error('user or room does not exist');
    if(!Room.isCreater) throw new Error('you are not the creater of this room');

    await redis.hdel(`users:${User.username}`,'paid');
    try{
    await Driver.executeQuery(`
    MATCH (p:prvRoom{roomId:$roomId})
    DETACH DELETE p
    `,{
        roomId:Room.prvRoom
    })
    res.cookie('prvRoom','',{
        expires:new Date(0),
        httpOnly:true,
        secure:true,
        sameSite:'lax',
    })
    return 'room distroryed';
}
    catch(err){
        console.log(err);
        if(err.message) throw new Error(err.message);
        throw new Error('room does not exist');
    }
}

const updateRoom=async({password},{res,User,Room})=>{
    if(!User || !Room) throw new Error('user or room does not exist');
    if(!Room.isCreater) throw new Error('you are not the creater of this room');
    try{
        await Driver.executeQuery(`
        MATCH (p:prvRoom{roomId:$roomId})
        SET p.password=$password
        RETURN p
        `,{
            roomId:Room.prvRoom,
            password
        })

        return 'room updated';
    }
    catch(err){
        console.log(err);
        if(err.message) throw new Error(err.message);
        throw new Error('room does not exist');
    }
}

const createAndgetLink=async({expiration},{res,User,Room})=>{
    console.log(expiration);
    try{
    if(!User || !Room) throw new Error('user or room does not exist');
    if(!Room.isCreater) throw new Error('you are not the creater of this room');
    if(!expiration) return await redis.get(`Room:Link:${Room.prvRoom}`)||null;
    const uuid=crypto.randomUUID();
        if(await redis.exists(`Room:Link:${Room.prvRoom}`)) throw new Error('link already exists');
        await redis.set(`Room:Link:${Room.prvRoom}`,uuid,'EX',expiration);
        return uuid;
    }
    catch(err){
        console.log(err);
        if(err.message) throw new Error(err.message);
        throw new Error('error in creating link');
    }
}

const leaveRoom=async({username},{res,User,Room})=>{
    if(!User || !Room) throw new Error('user or room does not exist');

    try{
    await Driver.executeQuery(`
    MATCH (p:prvRoom{roomId:$roomId})-[r:JOINED_BY]->(u:person{username:$User})
    DELETE r
    `,{
        roomId:Room.prvRoom,
        User:username?username:User.username
    });
    if(User.username!==Room.prvRoom)
    res.cookie('prvRoom','',{
        expires:new Date(0),
        httpOnly:true,
        secure:true,
        sameSite:'lax',
    });
    return 'room left';
    }
    catch(err){
        console.log(err);
        if(err.message) throw new Error(err.message);
        throw new Error('error in leaving room');
    }
}

const getConnectionRoom=async({after},{res,User})=>{
    try{
    if(!User) throw new Error('unauthorized');
    const result=await Driver.executeQuery(`
    MATCH (p1:prvRoom)<-[:CREATED_BY]-(u2:person)-[:FOLLOW]->(u:person{username:$username})-[:FOLLOW]->(u1:person)-[:CREATED_BY]->(p:prvRoom)
    WHERE u2.username<>u1.username 
    AND (p1.createdAt < datetime($after) OR p.createdAt < datetime($after))
    WITH collect(p1) + collect(p) AS rooms
    UNWIND rooms AS room
    OPTIONAL MATCH (room)<-[:JOINED_BY]-(joined:person)
    RETURN DISTINCT room,COUNT(DISTINCT joined) AS joinedCount
    ORDER BY room.createdAt DESC
    LIMIT 10
    `,{
        username:User.username,
        after:after?after:new Date().toISOString()
    });
    
    const edges=result.records.map((record)=>{
        const room=record.get('room');
        return {
        cursor:record.get('room').properties.createdAt.toString(),
        node:{
            roomId:room.properties.roomId,
            roomType:room.properties.roomType,
            roomSize:Number(room.properties.roomSize)||10,
            totalJoined:record.get('joinedCount').toNumber()
        }
        }
    });

    const pageInfo={
        hasNextPage:edges.length===10,
        endCursor:edges[edges.length-1]?.cursor
    };

    return {edges,pageInfo};
    }
    catch(err){
        console.log(err);
        if(err.message) throw new Error(err.message);
        throw new Error('error in getting connection');
    }
};

module.exports={
    createRoom,
    joinRoom,
    destroyRoom,
    updateRoom,
    createAndgetLink,
    leaveRoom,
    getConnectionRoom
};