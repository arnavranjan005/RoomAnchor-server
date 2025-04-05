const {redis, Driver}=require('../DB/connection.js')

const handleFollow=async({username},context)=>{
    if(!context.User) throw new Error("Unauthorized");

    const user=context.User.username;
    const reqUser=username

    const connection= await Driver.executeQuery(`
        MATCH (u1:person{username:$user})-[r:FOLLOW]->(u2:person{username:$reqUser})
        RETURN r AS R
        `,{
            user,
            reqUser
        })
    if(await redis.hexists(`users:${user}`,`pending:${reqUser}`))
        throw new Error('Already requested');

    if(connection.records[0] && connection.records[0].get('R')) throw new Error('Already following');
    await redis.hset(`users:${user}`,`pending:${reqUser}`,'pending');
    await redis.hset(`users:${reqUser}`,`request:${user}`,'request');
    await redis.hdel(`users:${user}`,`follow_back:${reqUser}`);

    return 'pending';
}

const getFollowreq=async({username},context)=>{
    if(!context.User) throw new Error("Unauthorized");
    const user=context.User.username;
    const reqUser=username;

    const pending=await redis.hget(`users:${user}`,`pending:${reqUser}`);
    const request=await redis.hget(`users:${user}`,`request:${reqUser}`);
    const follow_back=await redis.hget(`users:${user}`,`follow_back:${reqUser}`);

    const following= await Driver.executeQuery(`
        OPTIONAL MATCH (u1:person{username:$user})-[r:FOLLOW]->(u2:person{username:$reqUser})
        WITH u1, u2, r
        OPTIONAL MATCH (u2)-[r2:FOLLOW]->(u1)
        RETURN r AS R, r2 AS R2`,{
            user,
            reqUser
        });

    let connection=`${null} ${null} ${null} ${null} ${null} ${null}`;
    connection=connection.split(' ');

    if(pending) connection[0]='pending';
    if(request){
    connection[1]='request';
    connection[2]='Reject';
    }
    if(follow_back){
    connection[3]='follow_back';
    connection[4]='Disconnect';
    }

    if(following.records[0].get('R')&& !following.records[0].get('R2')) connection[5]='Unfollow';
    if(following.records[0].get('R') && following.records[0].get('R2')){ connection[5]='Unfollow';
    connection[4]='Disconnect';
    }
    connection=connection.join(' ');
    console.log(connection,reqUser,user);
    
    return connection;
}

const acceptFollowreq=async({username},context)=>{
    if(!context.User) throw new Error("Unauthorized");

    const user=context.User.username;
    const reqUser=username;
    await redis.hdel(`users:${user}`,`request:${reqUser}`);
    await redis.hdel(`users:${reqUser}`,`pending:${user}`);

    const connection= await Driver.executeQuery(`
        MATCH (u1:person{username:$reqUser}), (u2:person{username:$user})
        MERGE (u1)-[r:FOLLOW]->(u2)
        WITH u1, u2
        OPTIONAL MATCH (u2)-[r2:FOLLOW]->(u1)
        RETURN r2 AS R2
    `,{
        reqUser,
        user
    })

    if(connection.records[0] && connection.records[0].get('R2')) return 'Unfollow Disconnect';
        
    await redis.hset(`users:${user}`,`follow_back:${reqUser}`,'follow_back');
    return 'follow_back Disconnect';
}

const rejectFollowreq=async({username},context)=>{
    if(!context.User) throw new Error("Unauthorized");
    const user=context.User.username;
    const reqUser=username;

    await redis.hdel(`users:${user}`,`request:${reqUser}`);
    await redis.hdel(`users:${reqUser}`,`pending:${user}`);
    const connection=await Driver.executeQuery(`
        OPTIONAL MATCH (u1:person{username:$user})-[r:FOLLOW]->(u2:person{username:$reqUser})
        RETURN r AS R`,{
            reqUser,
            user
        });

    if(connection.records[0].get('R')){
         await redis.hset(`users:${reqUser}`,`follow_back:${user}`,'follow_back');
         return 'Unfollow'
        };
    return 'ok';
}

const cancelFollowreq=async({username},context)=>{
    if(!context.User) throw new Error("Unauthorized");
    const user=context.User.username;
    const reqUser=username;
    if(await redis.hexists(`users:${reqUser}`,`follow_back:${user}`))
        throw new Error('invalid request. Please refresh');
    const connection=await Driver.executeQuery(`
        OPTIONAL MATCH (u1:person{username:$reqUser})-[r:FOLLOW]->(u2:person{username:$user})
        WITH u1, u2, r
        OPTIONAL MATCH (u2)-[r2:FOLLOW]->(u1)
        RETURN r AS R, r2 AS R2`,{
            reqUser,
            user
        });
    
    if(connection.records[0].get('R2')) 
        throw new Error('invalid request. Please refresh');

    await redis.hdel(`users:${user}`,`pending:${reqUser}`);
    await redis.hdel(`users:${reqUser}`,`request:${user}`);
    if(connection.records[0].get('R')){
        await redis.hset(`users:${user}`,`follow_back:${reqUser}`,'follow_back');
        return 'follow_back Disconnect';
    };
    return 'Follow';
}

const unfollow=async({username},context)=>{
    if(!context.User) throw new Error("Unauthorized");
    const user=context.User.username;
    const reqUser=username;

    const connection= await Driver.executeQuery(`
        MATCH (u1:person{username:$user})-[r:FOLLOW]->(u2:person{username:$reqUser})
        WITH u1, u2, r
        OPTIONAL MATCH (u2)-[r2:FOLLOW]->(u1)
        DELETE r
        WITH r2
        RETURN r2 AS R2`,{
            user,
            reqUser
        })

    if(connection.records[0] && connection.records[0].get('R2')){
    await redis.hset(`users:${user}`,`follow_back:${reqUser}`,'follow_back');
    return 'Follow_back Disconnect';
    }
    await redis.hdel(`users:${reqUser}`,`follow_back:${user}`);
    return 'Follow';
}

const disconnect=async({username},context)=>{
    if(!context.User) throw new Error("Unauthorized");
    const user=context.User.username;
    const reqUser=username;

    const connection= await Driver.executeQuery(`
        MATCH (u1:person{username:$reqUser})-[r:FOLLOW]->(u2:person{username:$user})
        DELETE r
        WITH u1, u2
        OPTIONAL MATCH (u2)-[r2:FOLLOW]->(u1)
        RETURN r2 AS R2`,{
            reqUser,
            user
        })
        console.log(connection.records[0]);
        
    if(connection.records[0] && connection.records[0].get('R2')){
        await redis.hset(`users:${reqUser}`,`follow_back:${user}`,'follow_back');
        return 'Unfollow';
    }
    await redis.hdel(`users:${user}`,`follow_back:${reqUser}`);
    return 'Follow';
}


const getFollowing=async({after,username},context)=>{
    if(!context.User) throw new Error("Unauthorized");

    try{
       const connection= await Driver.executeQuery(`
            MATCH (u1:person {username: $username})-[:FOLLOW]->(u2:person)
            OPTIONAL MATCH (u2)<-[r:FOLLOW]-(u3:person)
            WITH u2, count(r) AS FollowingCount
            WHERE FollowingCount >= toInteger($after)
            RETURN u2 AS Following, FollowingCount
            ORDER BY FollowingCount DESC
            LIMIT 10
            `,{
                username,
                after:after||0
            });
        
        const edges=connection.records.map((record)=>({
            cursor:record.get('FollowingCount')?.toNumber(),
            node:{
                username:record.get('Following')?.properties.username,
                url:record.get('Following')?.properties.url
            }
        }));

        console.log(edges.length);
        
        const pageInfo={
            hasNextPage:edges.length===10,
            endCursor:edges[edges.length-1]?.cursor?edges[edges.length-1]?.cursor:0
        };
        return {edges,pageInfo};

    }
    catch(err){
        console.log(err);
        
        throw new Error(err.message);
    }
}

const getFollowers=async({after,username},context)=>{
    if(!context.User) throw new Error("Unauthorized");
    const connection= await Driver.executeQuery(`
        MATCH (u1:person{username:$username})<-[:FOLLOW]-(u2:person)OPTIONAL MATCH (u2)<-[r:FOLLOW]-(u3:person)
        WITH u2,count(r) AS FollowerCount
        WHERE FollowerCount >= toInteger($after)
        RETURN u2 AS Followers,FollowerCount
        ORDER BY FollowerCount DESC
        LIMIT 10
        `,{ after:after||0,
            username
        });

    const edges=connection.records.map(record=>({
        cursor:record.get('FollowerCount')?.toNumber(),
        node:{
            username:record.get('Followers')?.properties.username,
            url:record.get('Followers')?.properties.url
        }}));
    
    const pageInfo={
        hasNextPage:edges.length===10,
        endCursor:edges[edges.length-1]?.cursor?edges[edges.length-1]?.cursor:0
    };
    return {edges,pageInfo};
}

const getMetualFollowers=async({username},context)=>{
    console.log('getMetualFollowers',username,context.User);
    
    if(!context.User) throw new Error("Unauthorized");
    try{
    const user=context.User.username;
    const reqUser=username;
    const connection= await Driver.executeQuery(`
    MATCH (u1:person {username:$user})<-[:FOLLOW]-(u2:person)-[:FOLLOW]->(u3:person {username:$reqUser})
    WHERE (u2)-[:FOLLOW]->(u1) AND (u2)-[:FOLLOW]->(u3)
    OPTIONAL MATCH (u2)<-[r:FOLLOW]-(u4:person)
    RETURN u2 AS MutualFollowers, count(r) AS FollowerCount
    ORDER BY FollowerCount DESC
    `,{
            user,
            reqUser
    });

    return connection.records.map(record=>({
        MutualFollowers:{
            url:record.get('MutualFollowers')?.properties.url,
            username:record.get('MutualFollowers')?.properties.username
        },
    })
    );
    }catch(err){
        console.log(err);
        throw new Error(err.message);
    }
};


const getSuggestionUsers=async({after},context)=>{
    try{
    if(!context.User) throw new Error("Unauthorized");
    const user=context.User.username;
    const connection= await Driver.executeQuery(`
        MATCH (u:person{username:$user})-[:FOLLOW]->(connection:person)-[r:FOLLOW]->(suggestions:person)
        WHERE u.username<>suggestions.username AND NOT (u)-[:FOLLOW]->(suggestions) AND NOT (suggestions)-[:FOLLOW]->(u)
        WITH suggestions, COUNT(r) AS followersCount
        WHERE followersCount >=toInteger($after)
        RETURN suggestions AS u, followersCount
        ORDER BY followersCount DESC
        LIMIT 10
        `,{
            user,
            after:after||0
        });
    
    const edges=connection.records.map(record=>({
        cursor:record.get('followersCount').toNumber(),
        node:{
            username:record.get('u').properties.username,
            url:record.get('u').properties.url
        }
    }));

    const pageInfo={
        hasNextPage:edges.length===10,
        endCursor:edges.length?edges[edges.length-1]?.cursor:0
    };
    
    return {edges,pageInfo};
    }catch(err){
        throw new Error(err.message);
    }
},

getUserfollowsent=async(context)=>{
    try {
        if(!context.User) throw new Error('Unauthorized');
        let cursor=0;
        let reqArray=[];
        do{
        const [newCursor,result]=await redis.hscan(`users:${context.User.username}`,cursor,'match','request:*','count',10);

        reqArray=[...reqArray,...result.filter((user)=>user.includes(':'))];
        cursor=newCursor;
        }while(cursor!=='0')

        return [...reqArray]
    } catch (error) {
        throw new Error(error.message);
    }
},

getUserfollowrecv=async(context)=>{
    try {
        if(!context.User) throw new Error("Unauthorized");
        let cursor=0;
        let reqArray=[];
        do{
        const [newCursor,result]=await redis.hscan(`users:${context.User.username}`,cursor,'match','pending:*','count',10);

        reqArray=[...reqArray,...result.filter((user)=>user.includes(':'))];
        cursor=newCursor;
        }while(cursor!=='0')

        return [...reqArray]
    } catch (error) {
        throw new Error("Unauthorized");
    }
}

module.exports={
    handleFollow,
    getFollowreq,
    unfollow,
    acceptFollowreq,
    disconnect,
    rejectFollowreq,
    cancelFollowreq,
    getFollowing,
    getFollowers,
    getMetualFollowers,
    getSuggestionUsers,
    getUserfollowsent,
    getUserfollowrecv
}
