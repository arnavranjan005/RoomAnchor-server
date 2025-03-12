const { createPayment, updateOrderStatus } = require("../../controllers/payments");

const queries={};

const mutation={
    createPayment:async(_,args,{req,res,User})=>{
        const {roomType,roomSize}=args;
        try {
            return await createPayment({roomSize,roomType},{req,res,User});
        } catch (error) {
            throw new Error(error.message);
        }
    },

    updateOrderStatus:async(_,args,{req,res,User})=>{
        const {orderId,status}=args;
        try {
            return await updateOrderStatus({orderId,status},{User});
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

const resolvers={mutation,queries};

module.exports={resolvers};