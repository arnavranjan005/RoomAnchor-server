const {redis, Driver, pc}=require(`../DB/connection.js`);
const {setUser}=require('../services/token/jwtToken.js');
const bycrpt=require('bcryptjs');
const {sendEmail}=require('../services/mail/mail.js')
const { uploadImg_Cloudinary } = require('../services/cloudinary.js');
const { aj } = require('../services/security/arcjet.js');
const {v4:uuid}=require('uuid');
const { imagekit } = require('../services/posts/imageKit.js');

const createUser=async({username,email,password,bio,websites},{req,res})=>{
    try{
        const userExists= await redis.exists(`users:${username}`);
        if(userExists){
            throw new Error('user already exists');
        };

        if(bio.length>200) throw new Error('bio should be atmost 200 characters');
        if(websites.length>3) throw new Error('websites should be atmost 3');
        if(username.length>20) throw new Error('username should be atmost 20 characters');
        if(username.length<3) throw new Error('username should be at least 3 characters');
        if(!username.length ||!/^[a-z0-9]+$/.test(username)) throw new Error('invalid username');
        if(username==='Room Anchor') throw new Error('username not allowed');
        if(!email.length ||!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email))
        throw new Error('invalid email');

        const decision=(await aj).protect(req,{
            email
        });

        if((await decision).isDenied()) throw new Error('invalid email');

        await redis.hset(`users:${username}`,'exists',true);
    
        const pass=await bycrpt.hash(password,10);

        const user=await Driver.executeQuery(`
            CREATE (u:person {username:$username,email:$email,password:$password,avatarURL:null,bio:$bio,websites:$websites})
            RETURN u.username AS username`,{
                username,
                email,
                password:pass,
                bio,
                websites
            });
            console.log(user.records[0].get('username'));
            
        const token=setUser(user.records[0].get('username'));
        
        res.cookie('uuid',token, {
            httpOnly: true,
            secure: true,
            sameSite:'lax',
            domain:'.room-anchor.space',
            maxAge: 1000*60*60*24*60
        });
        return token;
    }
    catch(err){
        throw new Error(err.message);
    }
}

const loginUser=async({username,password,token},{res})=>{
    try{
        if(token){
            if(await redis.get(`token:${username}`)!==token)
                throw new Error("token invalide");
            await Driver.executeQuery(`
            MATCH (p:person{username:$username})
            SET p.password=$password
            RETURN p
            `,{
                password,
                username
            });
        await redis.del(`token:${username}`);
        return 'Password changed';
        }
        
        else{
        const userExists= await redis.exists(`users:${username}`);
        if(!userExists){
            throw new Error('user does not exist');
        }
    const user=await Driver.executeQuery(
        `MATCH (p:person{username:$username})
         RETURN p.avatarURL As url, p.password AS pass
        `
    ,{username});

    const pass=await bycrpt.compare(password,user.records[0].get('pass'));
    if(!pass){
        throw new Error('invalid password');
    }
    
    const tokenId=setUser(username,user.records[0].get('url'));
    
    res.cookie('uuid',tokenId,{
        httpOnly:true,
        secure:true,
        sameSite:'lax',
        domain:'.room-anchor.space',
        maxAge:1000*60*60*24*60
    });
    return tokenId;
    }
    }catch(err){
        console.log(err);
        
        throw new Error(err.message);
    }
}

const getAllUsers=async({username},context)=>{
    if(!context.User) throw new Error("Unauthorized");
    if(username==='') return [];
    
    try{
    let usersInConnection=await Driver.executeQuery(
        `
        MATCH (me:person{username:$me})-[:FOLLOW*1..3]->(connection:person)
        WHERE connection.username STARTS WITH $username AND connection.username <> $me
        WITH DISTINCT connection
        OPTIONAL MATCH (connection)<-[r:FOLLOW]-(followers)
        RETURN COUNT(r) AS followersCount,connection.username AS username,connection.avatarURL AS url
        ORDER BY followersCount DESC
        LIMIT 10
        `,{
            username,
            me:context.User.username
        }
    );
    
    let usersNotInConnection=[];
    let connection=usersInConnection.records.map((user)=>({
            username:user.get('username'),
            url:user.get('url')
    }));
    
    if(usersInConnection.records.length<5)
       usersNotInConnection= await Driver.executeQuery(`
            MATCH (p:person)
            WHERE p.username STARTS WITH $username AND p.username <> $me AND NOT p.username IN $connections
            OPTIONAL MATCH (p)<-[r:FOLLOW]-()
            RETURN COUNT(r) AS followersCount, p.username AS username, p.avatarURL AS url
            ORDER BY followersCount DESC
            LIMIT 10
            `,{ me:context.User.username,
                username,
                connections:connection.map((user)=>user.username),
            });

            usersNotInConnection = usersNotInConnection.records.map((user) => ({
                username: user.get('username'),
                url: user.get('url'),
            }));

    return [...connection,...usersNotInConnection];
    }
    catch(err){
        console.log(err);
        
        throw new Error(err.message);
    }
}

const getPopularUsers=async()=>{
    try{
    const users= await Driver.executeQuery(`
    MATCH (p:person)-[r:FOLLOW]->(u:person)
    WITH u, COUNT(r) AS followersCount
    MATCH (u)-[:FOLLOW]->(other:person)
    WITH u, followersCount, COUNT(other) AS followingCount
    ORDER BY followersCount DESC
    LIMIT 10
    RETURN u.username AS username,u.bio AS bio, u.websites AS websites, u.avatarURL AS avatarURL, followersCount, followingCount
    `);

    return users.records.map((user)=>{
        console.log(user.get('username'),user.get('avatarURL'),user.get('followersCount').toNumber(),user.get('followingCount').toNumber());
        
        return {
            'username':user.get('username'),
            'url':user.get('avatarURL'),
            'bio':user.get('bio'),
            'websites':user.get('websites'),
            'followersCount':user.get('followersCount').toNumber(),'followingCount':user.get('followingCount').toNumber()
        };
    })
    }catch(err){
        console.log(err);
        
        throw new Error(err.message);
    }
};

const handleUploadImg=async(req,res)=>{
    try{

    const {url}=await uploadImg_Cloudinary(req.file.path);
    await Driver.executeQuery(`
        MATCH (p:person{username:$username})
        SET p.avatarURL=$url
        RETURN p
        `,{username:req.user.username,url:url});
        let tokenId;
        
        tokenId=setUser(req.user.username,url);console.log(tokenId);
        
        res.cookie('uuid',tokenId,{
            httpOnly:true,
            secure:true,
            sameSite:'lax',
            domain:'.room-anchor.space',
            maxAge:1000*60*60*24*60
        });
        return res.status(200).json({tokenId,url});
    }catch(err){console.log(err);
    
        return res.status(500).send(err.message);
    }
};

const getUseraccount=async({username},context)=>{
    try{
    const user=await Driver.executeQuery(`
        MATCH (u:person {username: $username})
        OPTIONAL MATCH (u)-[:CREATED_BY]->(createdRoom:prvRoom)
        OPTIONAL MATCH (createdRoom)<-[:JOINED_BY]-(createdRoomJoins:person)
        OPTIONAL MATCH (u)-[:JOINED_BY]->(joinedRoom:prvRoom)
        OPTIONAL MATCH (joinedRoom)<-[:JOINED_BY]-(joinedRoomJoins:person)
        OPTIONAL MATCH (follower:person)-[:FOLLOW]->(u)
        OPTIONAL MATCH (u)-[:FOLLOW]->(following:person)
        RETURN u,
       createdRoom, 
       joinedRoom, 
       COUNT(DISTINCT createdRoomJoins) AS createdJoinCount,
       COUNT(DISTINCT joinedRoomJoins) AS joinedJoinCount,
       COUNT(DISTINCT follower) AS followerCount,
       COUNT(DISTINCT following) AS followingCount
    `,{username});
    if(!user.records[0]) throw new Error('user not found!');
    const IsroomJoined=user.records[0]?.get('joinedRoom')?.properties;
    const IsRoomCreator=user.records[0]?.get('createdRoom')?.properties;

    return ({
        User:{
        username,
        url:user.records[0].get('u').properties.avatarURL,
        bio:user.records[0].get('u').properties.bio,
        websites:user.records[0].get('u').properties.websites,
        followersCount:user.records[0].get('followerCount').toNumber(),
        followingCount:user.records[0].get('followingCount').toNumber()
        },
        Room:{
            roomId:IsroomJoined?.roomId||IsRoomCreator?.roomId,
            roomType:IsroomJoined?.roomType||IsRoomCreator?.roomType,
            roomSize:IsroomJoined?.roomSize||IsRoomCreator?.roomSize,
            totalJoined:user.records[0].get('joinedJoinCount').toNumber()
        }
    })
    
    }catch(err){
        console.log(err);
        
        throw new Error(err.message);
    }
};

const editUser=async({email,currentPassword,newPassword,bio,websites},context)=>{
    if(!context.User) throw new Error("Unauthorized");
    let result;
    try{
        if(!(email?.length) && !(currentPassword?.length) && !(newPassword?.length) && !(bio?.length) && !(websites?.length)){
            if((!(currentPassword?.length)&&(newPassword?.length))||((currentPassword?.length)&&(!(newPassword?.length)))) throw new Error('invalid password');
            result=await Driver.executeQuery(`
                MATCH(u:person{username:$username})
                RETURN u
            `,{username:context.User.username});
            return {
                bio:result.records[0].get('u').properties.bio,
                websites:result.records[0].get('u').properties.websites,
                email:result.records[0].get('u').properties.email
            };
        }
        if(email?.length>0){
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email))
            throw new Error('invalid email');
    
            const decision=(await aj).protect(context.req,{
                email
            });
            if((await decision).isDenied()) throw new Error('invalid email');

            result=await Driver.executeQuery(`
                MATCH(u:person{username:$username})
                SET u.email=$email
                RETURN u.email AS email
            `,{username:context.User.username,email});
            return {emailChanged:'email changed'};
        }

        if(currentPassword?.length>0 && newPassword?.length>0){
            result=await Driver.executeQuery(`
                MATCH(u:person{username:$username})
                RETURN u.password AS password
            `,{username:context.User.username});
        
        if(await bycrpt.compare(currentPassword,result.records[0].get('password'))) throw new Error('invalid password');

        const pass=await bycrpt.hash(newPassword,10);
        await Driver.executeQuery(`
            MATCH(u:person{username:$username})
            SET u.password=$pass
            RETURN u.password AS password
        `,{username:context.User.username,pass});
        return {passwordChanged:'password changed'};
    }

        if(bio?.length>0){
            if(bio.length>200) throw new Error('bio should be atmost 200 characters');
            result=await Driver.executeQuery(`
                MATCH(u:person{username:$username})
                SET u.bio=$bio
                RETURN u.bio AS bio
            `,{username:context.User.username,bio});
            return {bioChanged:'bio changed'};
        }

        if(websites?.length>0){console.log(websites);
        
            if(websites.length>3) throw new Error('websites should be atmost 3');
            result=await Driver.executeQuery(`
                MATCH(u:person{username:$username})
                SET u.websites=$websites
                RETURN u.websites AS websites
            `,{username:context.User.username,websites});
            return {websitesChanged:'websites changed'};
        }
    }
    catch(err){
        console.log(err);
        
        throw new Error(err.message);
    }
};

const forgotPassword=async({username,email,newPassword,link},{User,req,res})=>{
    try{
        if(User) throw new Error('Unauthorized');
        
        if(newPassword || link){
            if(!newPassword?.length ||!link?.length) throw new Error('invalid link');
            const user=link.split('%')[0];
            const token=link.split('%')[1];
            
            if(token!=await redis.get(`forgotPasslink:${user}`)) throw new Error('link expired');
            const pass=await bycrpt.hash(newPassword,10);
            const result= await Driver.executeQuery(`
                MATCH(u:person{username:$username})
                SET u.password=$pass
                RETURN u.password AS password, u.avatarURL AS url
            `,{username:user,pass});

            await redis.del(`forgotPasslink:${user}`);console.log(result.records);
            
            const jwtToken=setUser(user,result.records[0].get('url'));
            res.cookie('uuid',jwtToken,{
                httpOnly: true,
                secure: true,
                sameSite:'lax',
                domain:'.room-anchor.space',
                maxAge: 1000*60*60*24*60
            })

            return 'password changed';
        };

        if(username?.length && !email?.length) throw new Error('invalid email');
        if(!email?.length ||!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) throw new Error('invalid email');
        const decision=(await aj).protect(req,{
            email
        });
        if((await decision).isDenied()) throw new Error('invalid email');

        if(!username?.length){
        const user=await Driver.executeQuery(`
            MATCH(u:person{email:$email})
            RETURN u.username AS username`,{email});
        if(!user?.records?.length) throw new Error('user does not exist');
        const usernames=user.records.map(record=>record.get('username'));
        return `${usernames.join(',')}`;
        }
        const isValidUser=await Driver.executeQuery(`
            MATCH(u:person{username:$username})
            RETURN u.email AS email`,{username});
        if(!isValidUser?.records?.length|| isValidUser.records[0].get('email')!==email) throw new Error('user does not exist');

        const token=uuid();
        await redis.set(`forgotPasslink:${username}`,token,'EX',60*10);

        sendEmail({
            to: email,
            subject: 'Reset Password',
            html:`
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>RoomAnchor - Reset Password</title>
              </head>
              <body>
                <div id="root"></div>
                  <h1>Reset Password</h1>
                  <p>Click the link below to reset your password</p>
                  <a href="${process.env.CLIENT_URL}/forgotPass/${username}?token=${token}" style="color:blue">Reset Password</a>
              </body>`
        });

        return 'email sent';
   }
   catch(err){
    console.log(err);
    
    throw new Error(err.message);
   }
};

const getSearchUsers=async({username,after},{User})=>{
    try{
    if(!User) throw new Error('Unauthorized');
    const res=await Driver.executeQuery(`
        MATCH (p:person)
        WHERE p.username STARTS WITH $username
        WITH p, COUNT{(p)<-[:FOLLOW]-()} AS followerCount 
        WHERE followerCount >= $after 
        RETURN followerCount, p AS person
        ORDER BY followerCount DESC
        LIMIT 10
        `,{
            username,
            me:User.username,
            after:after||0
        });

        const edges=res.records.map(record=>{
            return {
                cursor:record.get('followerCount').toNumber(),
                node:{
                username:record.get('person').properties.username,
                url:record.get('person').properties.avatarURL,
                bio:record.get('person').properties.bio,
                websites:record.get('person').properties.websites,
            }
        }
        });
        
        const pageInfo={
            hasNextPage:edges.length===10,
            endCursor:edges.length?edges[edges.length-1]?.cursor:0
        };

        return { edges, pageInfo };
    }
    catch(err){
        console.log(err);
        
        throw new Error(err.message);
    }
};

const DeleteAccount=async({User,res})=>{
    try{
        if(!User) throw new Error('Unauthorized');
        await redis.del(`users:${User.username}`);
        await redis.del(`forgotPasslink:${User.username}`);
        await redis.del(`Room:${User.username}`);
        const postDetails=await Driver.executeQuery(`
        MATCH (u:person {username: $username})
        OPTIONAL MATCH (u)-[r:POST]->(p:post)
        OPTIONAL MATCH (u)-[f:FOLLOW]->(f1:person)
        OPTIONAL MATCH (u)<-[f2:FOLLOW]-(f3:person)
        WITH u, r, p,f,f2, COLLECT(p) AS posts
        OPTIONAL MATCH (u)-[ord:ORDER]->(o:order)
        DELETE r,f,f2, ord, u, p, o
        RETURN posts`,
        {username:User.username});

        const postArray=postDetails.records[0].get('posts');

        if(postArray.length){
            const index=pc.Index(process.env.PINECONE_INDEX_NAME);
            await index.namespace("post").deleteMany(postArray.map(post=>post.properties.id));
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            const deletionResults = [];
            for (const post of postArray) {
              try {
                await imagekit.deleteFile(post.properties.filePath);
                deletionResults.push({ success: true, filePath: post.properties.filePath });
                await delay(100);
              } catch (error) {
                deletionResults.push({ success: false, filePath: post.properties.filePath, error });
              }
            }
        }
        const resdb=await fetch(`${process.env.EVENTS_URL}/${User.username}`,{
            method:'DELETE',
            headers: {
                'x-api-key': process.env.CREDENTIAL_KEY,
                'Content-Type': 'application/json'
            }
        });
        if(!resdb.ok) throw new Error('Internal server error');

        res.cookie('uuid','',{
            maxAge:0,
            httpOnly:true,
            secure:true,
            sameSite:'lax',
            domain:'.room-anchor.space',
        });

        return 'account deleted';
    }
    catch(err){
        console.log(err);
        
        throw new Error(err.message);
    }
};

const DeleteImage=async(context)=>{
    try{
        const {User,res}=context;
        if(!User) throw new Error('Unauthorized');
        await Driver.executeQuery(`
        MATCH (u:person {username: $username})
        SET u.avatarURL = ''
        `, {username:User.username});
        const token=setUser(User.username);
        res.cookie('uuid',token,{
            httpOnly:true,
            secure:true,
            sameSite:'lax',
            domain:'.room-anchor.space',
            maxAge:1000*60*60*24*60,
        });
        return 'image deleted';
    }
    catch(err){
        console.log(err);
        
        throw new Error(err.message);
    }
};

module.exports={
    createUser,
    loginUser,
    getAllUsers,
    handleUploadImg,
    getPopularUsers,
    getUseraccount,
    editUser,
    forgotPassword,
    getSearchUsers,
    DeleteAccount,
    DeleteImage
}