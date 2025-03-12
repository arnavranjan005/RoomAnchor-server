const { getImageKitAuth, createPost, getUserPosts, updateVote, getPost, getAisuggestedPosts, getPopularPosts, getLatestPosts, getAllPosts, deletePost } = require("../../controllers/post");

const queries={
    getImageKitAuth:(_,args,{User})=>{
        try{
        return getImageKitAuth({User});
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    getUserPosts:(_,args,{User})=>{
        try{
        const {username}=args;
        return getUserPosts({username},{User});
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    getPost:(_,args,context)=>{
        try{
        const {id}=args;
        return getPost({postId:id},context);
        }
        catch(err){console.log(err);
        
        throw new Error(err.message);
        }
    },

    getAisuggestedPosts:(_,args,context)=>{
        try{
        const {after}=args;
        return getAisuggestedPosts({after},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    getPopularPosts:(_,args,context)=>{
        try{
        const {afterVotes,ids}=args;
        return getPopularPosts({afterVotes,ids},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    getLatestPosts:(_,args,context)=>{
        try{
        const {after}=args;
        return getLatestPosts({after},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    getAllPosts:(_,args,context)=>{
        try{
        const {limit,content,ids}=args;
        return getAllPosts({limit,content,ids},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    }
}

const mutation={
    createPost:(_,args,{User})=>{
        try{
        const {title,content,filePath,fileType}=args;
        return createPost({title,content,filePath,fileType},{User});
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    updateVote:(_,args,{User})=>{
        try{
        const {postId,vote}=args;
        return updateVote({postId,vote},{User});
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    deletePost:(_,args,{User})=>{
        try{
        const {id}=args;
        return deletePost({id},{User});
        }
        catch(err){
        throw new Error(err.message);
        }
    }
}

const resolvers={queries,mutation};

module.exports ={resolvers}