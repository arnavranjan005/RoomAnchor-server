const { handleFollow, rejectFollowreq, acceptFollowreq, disconnect, unfollow, cancelFollowreq, getFollowreq, getFollowing, getMetualFollowers, getFollowers, getSuggestionUsers, getUserfollowsent, getUserfollowrecv } = require("../../controllers/followNunfollow");
const { createUser, loginUser, getAllUsers, getPopularUsers, getUseraccount, editUser, forgotPassword, getSearchUsers, DeleteAccount } = require("../../controllers/user");
const { verify } = require("../../controllers/verify");

const queries={
    getUseraccount:async(_,args,context)=>{
        const {username}=args;
        try{
        return await getUseraccount({username},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    getAllUsers:async(_,args,context)=>{
        const {username}=args;
        try{
        return await getAllUsers({username},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    getFollowreq:async(_,args,context)=>{
        const {username}=args;
        try{
        return await getFollowreq({username},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },
    
    getFollowing:async(_,args,context)=>{
        const {after,username}=args;
        try{
        return await getFollowing({after,username},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    getMetualFollowers:async(_,args,context)=>{
        const {username}=args;
        try{
        return await getMetualFollowers({username},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    getFollowers:async(_,args,context)=>{
        const {after,username}=args;
        try{
        return await getFollowers({after,username},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    getPopularUsers:async()=>{
        try{
        return await getPopularUsers();
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    getSuggestionUsers:async(_,args,context)=>{
        const {after}=args;
        try{
        return await getSuggestionUsers({after},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    getUseraccount:async(_,args,context)=>{
        const {username}=args;
        try{
        return await getUseraccount({username},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    getSearchUsers:async(_,args,context)=>{
        const {username,after}=args;
        try{
        return await getSearchUsers({username,after},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },
    
    getUserfollowsent:async(_,arg,context)=>{
        try {
            return await getUserfollowsent(context);
        } catch (error) {
            throw new Error(error.message);
        }
    },

    getUserfollowrecv:async(_,arg,context)=>{
        try {
            return await getUserfollowrecv(context);
        }catch(error){
            throw new Error(error.message);
        }
    }
}

const mutation={
    checkUser_Room:async(_,args,context)=>{
        try{
        const {q,r,t}=args;
        
        const u= await verify({q,r,t},context);
        console.log("u : ",u);
        return u;
        }
        catch(err){console.log(err.message);
        
        throw new Error(err.message);
        }
    },

    createUser:async(_,args,{req,res})=>{
        const {username,email,password,bio,websites}=args;
        try{
        return await createUser({username,email,password,bio,websites},{req,res});
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    loginUser:async(_,args,{res})=>{
        const {username,password,token}=args;
        console.log(username,password,token);
        
        try{
        return await loginUser({username,password,token},{res});
        }catch(err){
        throw new Error(err.message);
        }
    },

    editUser:async(_,args,context)=>{
        const {email,currentPassword,newPassword,bio,websites}=args;
        try{
        return await editUser({email,currentPassword,newPassword,bio,websites},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    followReq:async(_,args,context)=>{
        const {username}=args;
        try{
        return await handleFollow({username},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    acceptReq:async(_,args,context)=>{
        const {username}=args;
        try{
        return await acceptFollowreq({username},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    rejectFollowreq:async(_,args,context)=>{
        const {username}=args;
        try{
        return await rejectFollowreq({username},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    disconnect:async(_,args,context)=>{
        const {username}=args;
        try{
        return await disconnect({username},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    unfollow:async(_,args,context)=>{
        const {username}=args;
        try{
        return await unfollow({username},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    cancelFollowreq:async(_,args,context)=>{
        const {username}=args;
        try{
        return await cancelFollowreq({username},context);
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    forgotPasslink:async(_,args,{User,req,res})=>{
        const {email,newPassword,link}=args;
        try{
        return await forgotPassword({email,newPassword,link},{User,req,res});
        }
        catch(err){
        throw new Error(err.message);
        }
    },

    DeleteAccount:(_,args,{User,res})=>{
        try{
        return DeleteAccount({User,res});
        }
        catch(err){
        throw new Error(err.message);
        }
    }
}

const resolvers={queries,mutation};
module.exports ={resolvers}