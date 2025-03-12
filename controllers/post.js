const { imagekit } = require("../services/posts/imageKit");
const {MyClassificationPipeline}=require('../services/Ai-model/ai');
const { pc, Driver } = require("../DB/connection");
const {v4:uuid}=require('uuid')

const getImageKitAuth=({User})=>{
    if(!User) throw new Error("Unauthorized");

    const {token,expire,signature}=imagekit.getAuthenticationParameters();
    console.log(token,expire,signature);
    
    return {token,expire,signature};
}


const createPost=async({title,content,filePath,fileType},{User})=>{
    try{
    if(!User) throw new Error("Unauthorized");

    if(!title.length || !content.length || !filePath.length) throw new Error("Please fill all the fields");
    if(title.length>20 || content.length>200) throw new Error("Title should be atmost 20 characters and content should be atmost 200 characters");

    const postId=`${User.username}-${uuid()}`;
    await Driver.executeQuery(`
    CREATE (p:post{id:$id,upvotes:0,downvotes:0,title:$title,content:$content,filePath:$filePath,fileType:$fileType,createdAt:datetime()})
    WITH p
    MATCH (u:person{username:$username})
    MERGE (u)-[:POST]->(p)
    `,{
        title,
        content,
        filePath,
        fileType,
        username:User.username,
        id:postId
    });

    const index=pc.Index(process.env.PINECONE_INDEX_NAME);

    const extractor=await MyClassificationPipeline.getInstance();
    const combinedText=`Title: ${title}\nContent: ${content}`;
    let vectors=await extractor(combinedText,{pooling: "mean",normalize: true});
    vectors=Array.from(vectors.data);

    await index.namespace("post").upsert([{
        id:postId,
        values:vectors,
        metadata:{username:User.username,url:User.url,title,content,fileType,filePath,createdAt:new Date().toISOString()}
    }]);

    return 'success';
    }catch(err){
        console.log(err);
        throw new Error(err.message);
    }
};


const getUserPosts=async({username},context)=>{
    if(!context.User) throw new Error("Unauthorized");
    try{
        const res=await Driver.executeQuery(`
            MATCH (u:person{username:$username})-[:POST]->(p:post)
            OPTIONAL MATCH (u)-[up:UPVOTE]->(p)
            OPTIONAL MATCH (u)-[down:DOWNVOTE]->(p)
            RETURN u.username AS username,u.avatarURL AS avatar,p.id AS id,p.upvotes AS upvotes,p.fileType AS fileType,p.downvotes AS downvotes,p.title AS title,p.content AS content,p.filePath AS filePath,p.createdAt AS createdAt,up AS upvoted,down AS downvoted`,{
            username,
            user:context.User.username
        });
        return res.records.map((post)=>({
            id:post.get('id'),
            title:post.get('title'),
            content:post.get('content'),
            filePath:post.get('filePath'),
            fileType:post.get('fileType'),
            createdAt:post.get('createdAt').toString(),
            upvotes:post.get('upvotes').toNumber(),
            downvotes:post.get('downvotes').toNumber(),
            isUpvoted:post.get('upvoted')?true:false,
            isDownvoted:post.get('downvoted')?true:false,
            user:{username:post.get('username'),url:post.get('avatar')}
        }));
    }catch(err){
        console.log(err);
        
        throw new Error(err.message);
    }
};

const updateVote=async({postId,vote},context)=>{
    try{
        if(!context.User) throw new Error("Unauthorized");
        vote===1? vote='upvotes':vote===0?vote='downvotes':vote=new Error("Invalid vote");
        if(vote instanceof Error) throw vote;
        

        vote==='upvotes'?await Driver.executeQuery(`
            MATCH (u:person {username: $username}), (p:post {id: $id})
            OPTIONAL MATCH (u)-[ru:UPVOTE]->(p)
            OPTIONAL MATCH (u)-[rd:DOWNVOTE]->(p)
            WITH u, p, ru, rd
            FOREACH (_ IN CASE WHEN ru IS NOT NULL THEN [1] ELSE [] END | 
             DELETE ru
             SET p.upvotes = p.upvotes - 1
            )
            FOREACH (_ IN CASE WHEN rd IS NOT NULL THEN [1] ELSE [] END |
              DELETE rd
              SET p.downvotes = p.downvotes - 1
            )
            FOREACH (_ IN CASE WHEN ru IS NULL THEN [1] ELSE [] END | 
             CREATE (u)-[:UPVOTE {createdAt:datetime()}]->(p)
             SET p.upvotes = p.upvotes + 1
            )
        `
        ,{
            id:postId,
            username:context.User.username
        })
        :
        await Driver.executeQuery(`
            MATCH (u:person {username: $username}), (p:post {id: $id})
            OPTIONAL MATCH (u)-[rd:DOWNVOTE]->(p)
            OPTIONAL MATCH (u)-[ru:UPVOTE]->(p)
            WITH u, p, rd, ru
            FOREACH (_ IN CASE WHEN rd IS NOT NULL THEN [1] ELSE [] END | 
             DELETE rd
             SET p.downvotes = p.downvotes - 1
            )
            FOREACH (_ IN CASE WHEN ru IS NOT NULL THEN [1] ELSE [] END |
              DELETE ru
              SET p.upvotes = p.upvotes - 1
            )
            FOREACH (_ IN CASE WHEN rd IS NULL THEN [1] ELSE [] END | 
             CREATE (u)-[:DOWNVOTE {createdAt:datetime()}]->(p)
             SET p.downvotes = p.downvotes + 1
            )
        `
        ,{
            id:postId,
            username:context.User.username
        });

        return 'success';
    }catch(err){
        console.log(err);
        throw new Error(err.message);
    }
};

const getPost=async({postId},context)=>{
    try{
    if(!postId.length) throw new Error("Unauthorized");
    let res;
    
    context.User?
        res=await Driver.executeQuery(`
        MATCH (p:post {id: $id})<-[:POST]-(c)
        OPTIONAL MATCH (u:person {username: $username})-[r:UPVOTE]->(p)
        OPTIONAL MATCH (u1:person {username: $username})-[d:DOWNVOTE]->(p)
        RETURN r AS Upvoted, d AS Downvoted, c AS creater, p AS post
        `,{username:context.User.username,id:postId})
        :
        res=await Driver.executeQuery(`
        MATCH (p:post {id: $id})<-[:POST]-(c)
        RETURN p AS post, c AS creater
        `,{id:postId});
        
        if(!res.records.length) throw new Error("Post not found");
         return {
            id:res.records[0].get('post').properties.id,
            title:res.records[0].get('post').properties.title,
            content:res.records[0].get('post').properties.content,
            filePath:res.records[0].get('post').properties.filePath,
            fileType:res.records[0].get('post').properties.fileType,
            createdAt:res.records[0].get('post').properties.createdAt.toString(),
            upvotes:res.records[0].get('post').properties.upvotes.toNumber(),
            downvotes:res.records[0].get('post').properties.downvotes.toNumber(),
            isUpvoted:context.User?res.records[0].get('Upvoted')?true:false:null,
            isDownvoted:context.User?res.records[0].get('Downvoted')?true:false:null,
            user:{username:res.records[0].get('creater').properties.username,url:res.records[0].get('creater').properties.avatarURL}
        }
    }catch(err){
        console.log(err);
        throw new Error(err.message);
    }
}

const getLatestPosts=async({after},context)=>{
    try{
        if(!context.User) throw new Error("Unauthorized");
        if(!(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(after))) throw new Error("Invalid date format");
        console.log('latest',after);
        
        const latestRes=await Driver.executeQuery(`
            MATCH (u:person {username: $username})
            MATCH (user)-[:POST]->(p:post)
            WHERE (user = u OR (u)-[:FOLLOW]->(user))
            AND p.createdAt >= datetime($after) - duration({days: 2})
            AND NOT EXISTS((u)-[:UPVOTE]->(p))
            AND NOT EXISTS((u)-[:DOWNVOTE]->(p))
            RETURN p.id AS id,p.title AS title,p.content AS content,p.filePath AS filePath,p.fileType AS fileType,p.createdAt AS createdAt,p.upvotes AS upvotes,p.downvotes AS downvotes,u.username AS username,u.avatarURL AS url
            ORDER BY p.createdAt DESC
            `,{
                username:context.User.username,
                after
            });

        if(!latestRes.records.length) return [];
            return latestRes?.records?.map((post)=>({
            id:post.get('id'),
            title:post.get('title'),
            content:post.get('content'),
            filePath:post.get('filePath'),
            fileType:post.get('fileType'),
            createdAt:post.get('createdAt').toString(),
            upvotes:post.get('upvotes').toNumber(),
            downvotes:post.get('downvotes').toNumber(),
            user:{username:post.get('username'),url:post.get('url')}
        }));
        }catch(err){
        console.log(err);
        throw new Error(err.message);
        }
    }

const getAisuggestedPosts=async({after},context)=>{
    try{
        if(!context.User) throw new Error("Unauthorized");
        if(!(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(after))) throw new Error("Invalid date format");
        console.log('AI',after);
        
        let aiRes;
        let dbRes;
        dbRes=await Driver.executeQuery(`
                MATCH (u:person {username: $username})-[r:UPVOTE]->(p:post)
                WHERE r.createdAt < datetime($after)
                RETURN p,r.createdAt AS voteTime
                ORDER BY r.createdAt DESC
                LIMIT 10
            `,{
                username:context.User.username,
                after
            });
        
        let combinedText='';

        dbRes.records.forEach((post)=>{
            combinedText+=`\n\n----Related Posts---\n`;
            combinedText+=`\nTitle: ${post.get('p')?.properties?.title}\nContent: ${post.get('p')?.properties?.content}\n`;
        });

        if(combinedText.length){

        const index=pc.Index(process.env.PINECONE_INDEX_NAME);
    
        const extractor=await MyClassificationPipeline.getInstance();
        let vectors=await extractor(combinedText,{pooling: "mean",normalize: true});
        vectors=Array.from(vectors.data);
        
    
        aiRes=await index.namespace("post").query({
                vector:vectors,
                topK:10,
                includeMetadata:true
        });

        const dbres=new Set(dbRes.records.map((post)=>post.get('p').properties.id));
        aiRes=aiRes.matches.filter((post)=>!dbres.has(post.id));
        aiRes=aiRes.filter((post)=>post.metadata.username!==context.User.username);
    }
    console.log(aiRes);
    if(!aiRes?.length) return {
        aiPostedges:[],
        aipageInfo:{
            hasNextPage:false   
        }
    };
    const aiPostedges=aiRes.map((post)=>({
        cursor:post.id,
        node:{
            id:post.id,
            title:post.metadata.title,
            content:post.metadata.content,
            filePath:post.metadata.filePath,
            fileType:post.metadata.fileType,
            createdAt:post.metadata.createdAt,
            user:{username:post.metadata.username,url:post.metadata?.url}
        }
        })
    );
    
    const aipageInfo={
        hasNextPage:aiPostedges.length===10,
        endCursor:dbRes.records[0].get('voteTime')?.toString()
    }
    console.log(typeof(aiPostedges),aiPostedges,aipageInfo);
    
    return {
        aiPostedges,
        aipageInfo
    }
    }
    catch(err){
        console.log(err);
        throw new Error(err.message);
    }
}

const getPopularPosts=async({afterVotes,ids},context)=>{
    try{
        let popularRes;
        
        context.User?
        popularRes=await Driver.executeQuery(`
            MATCH (u:person {username: $username})
            MATCH (p:person)-[:POST]->(post:post)
            WHERE NOT (u)-[:POST]->(post)
                AND NOT EXISTS((u)-[:UPVOTE]->(post))
                AND NOT EXISTS((u)-[:DOWNVOTE]->(post))
                AND NOT (post.id IN $ids)
                AND post.upvotes >= toInteger($upvotes)
            RETURN post, p
            ORDER BY post.upvotes DESC
            LIMIT 10
            `,{
                username:context.User.username,
                ids,
                upvotes:afterVotes||0
            })
            :
            popularRes=await Driver.executeQuery(`
                MATCH (p:person)-[:POST]->(post:post)
                WHERE post.upvotes >= toInteger($upvotes)
                AND NOT (post.id IN $ids)
                RETURN post, p
                ORDER BY post.upvotes DESC
                LIMIT 10
                `,{
                ids,
                upvotes:afterVotes||0,
            });
        
            const popularpostEdges=popularRes.records.map((post)=>({
                cursor:post.get('post').properties.upvotes.toNumber(),
                node:{
                    id:post.get('post').properties.id,
                    title:post.get('post').properties.title,
                    content:post.get('post').properties.content,
                    filePath:post.get('post').properties.filePath,
                    fileType:post.get('post').properties.fileType,
                    createdAt:post.get('post').properties.createdAt.toString(),
                    upvotes:post.get('post').properties.upvotes.toNumber(),
                    downvotes:post.get('post').properties.downvotes.toNumber(),
                    user:{username:post.get('p').properties.username,url:post.get('p').properties.avatarURL}
                }
            }));

            const popularpostPageInfo={
                hasNextPage:popularRes.records.length===10,
                endCursor:popularpostEdges[popularpostEdges.length-1]?.cursor
            }
        
            return {
                popularpostEdges,
                popularpostPageInfo
            }
    }
    catch(err){
        console.log(err);
        throw new Error(err.message);
    }
};

const getAllPosts=async({content,ids=[],limit},context)=>{
    try{
        if(!context.User) throw new Error("Unauthorized");

        const index=pc.Index(process.env.PINECONE_INDEX_NAME);
    
        const extractor=await MyClassificationPipeline.getInstance();
        let vectors=await extractor(content,{pooling: "mean",normalize: true});
        vectors=Array.from(vectors.data);
        
    
        let aiRes=await index.namespace("post").query({
                vector:vectors,
                topK:limit,
                includeMetadata:true
        });

        aiRes=aiRes.matches.filter((post)=>!ids.includes(post.id));

        return aiRes.map((post)=>({
            id:post.id,
            title:post.metadata.title,
            content:post.metadata.content,
            filePath:post.metadata.filePath,
            fileType:post.metadata.fileType,
            createdAt:post.metadata.createdAt,
            user:{username:post.metadata.username,url:post.metadata?.url}
        }));
    }
    catch(err){
        console.log(err);
        throw new Error(err.message);
    }
};

const deletePost=async({id},context)=>{
    try{
        if(!context.User) throw new Error("Unauthorized");
        if(id.length && id.split('-')[0]!==context.User.username) throw new Error("Unauthorized");

        await Driver.executeQuery(`MATCH (p:post {id: $id}) DETACH DELETE p`,{id});

        const index=pc.Index(process.env.PINECONE_INDEX_NAME);
        await index.namespace("post").deleteOne(id);

        return true;
    }
    catch(err){
        console.log(err);
        throw new Error(err.message);
    }
};

module.exports={
    getImageKitAuth,
    createPost,
    getUserPosts,
    updateVote,
    getPost,
    getAisuggestedPosts,
    getPopularPosts,
    getLatestPosts,
    getAllPosts,
    deletePost
}