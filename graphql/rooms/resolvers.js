const { createRoom, joinRoom, destroyRoom, updateRoom, createAndgetLink, leaveRoom, getConnectionRoom } = require("../../controllers/room");

const queries={
    getConnectionRoom:async(_,args,{User})=>{
        try {
            const {after}=args;
            return await getConnectionRoom({after},{User});
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

const mutation={
    createRoom:async(_,args,{res,User})=>{
        const {password,roomType,roomSize}=args;
        try {
            return await createRoom({password,roomType,roomSize},{res,User});
        } catch (error) {
            throw new Error(error.message);
        }
    },

    joinRoom:async(_,args,{res,User})=>{
        const {roomId,password}=args;
        try {
            return await joinRoom({roomId,password},{res,User});
        } catch (error) {
            throw new Error(error.message);
        }
    },

    destroyRoom:async(_,args,{res,User,Room})=>{
        try {
            return await destroyRoom({res,User,Room});
        } catch (error) {
            throw new Error(error.message);
        }
    },

    updateRoom:async(_,args,{res,User,Room})=>{
        const {password}=args;
        try {
            return await updateRoom({password},{res,User,Room});
        } catch (error) {
            throw new Error(error.message);
        }
    },

    createAndgetLink:async(_,args,{res,User,Room})=>{
        const {expiration}=args;
        try{
            return await createAndgetLink({expiration},{res,User,Room});
        } catch (error) {
            throw new Error(error.message);
        }
    },

    leaveRoom:async(_,args,{res,User,Room})=>{
        try {
            const {username}=args;
            return await leaveRoom({username},{res,User,Room});
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

const resolvers={queries,mutation};

module.exports ={resolvers}