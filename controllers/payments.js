const { Driver, redis } = require("../DB/connection");
const { instance } = require("../services/razorpay");
const {lookup}=require('geoip-lite')

const setOrder=async({username,roomSize,orderId,amount,currency,date})=>{
    try{
    await redis.hset(`users:${username}`,'paid','pending');
    await Driver.executeQuery(`
    MATCH (p:person{username:$username})
    MERGE (p)-[:ORDER]->(o:order{orderId:$orderId,roomSize:$roomSize,price:$price,status:'pending',createdAt:$date,currency:$currency})`,{
        username,
        orderId,
        roomSize,
        price:amount,
        currency,
        date:date.toString()
    });

    return 'order placed successfully';
    }catch(err){
        console.log(err);
        
        throw new Error(err.message);
    }
}

const updateOrderStatus=async({orderId,status},{User})=>{
    try{
    if(!User) throw new Error('user does not exist');
    const res= await Driver.executeQuery(`
    MATCH (u:person{username:$username})-[:ORDER]->(o:order{orderId:$orderId})
    SET o.status=$status
    SET o.updatedAt=$date
    RETURN o
    `,{
        username:User.username,
        orderId,
        status,
        date:new Date().toISOString()
    });
    if(status==='exited from checkout') await redis.hdel(`users:${User.username}`,'paid');
    if(!(res?.records?.length)) throw new Error('order does not exist');
    return 'order status updated successfully';
    }catch(err){
        console.log(err);
        
        throw new Error(err.message);
    }
}

const createPayment=async({roomSize,roomType},{req,res,User})=>{
    if(!User) throw new Error('user does not exist');
    if(roomType!=='video' && roomSize<=5) throw new Error('room size must be greater than 5');
    if(await redis.hget(`users:${User.username}`,'paid')=='true') return 'payment already done';
    const geo=lookup(req.ip);console.log(geo);
    const country=geo?.country;
    try{
        const orderDetails=await instance.orders.create({
            amount:(country==='IN'?5:3)*(roomSize-5)*100,
            currency:country==='IN'?'INR':'USD',
            receipt:`${User.username}_${roomType}`,
            notes:{
                roomSize:roomSize.toString(),
                date:new Date()
            }
        });

        await setOrder({username:User.username,orderId:orderDetails.id,roomSize,amount:orderDetails.amount,currency:orderDetails.currency,date:orderDetails.notes.date});
        return{
            orderId:orderDetails.id,
            amount:orderDetails.amount,
            currency:orderDetails.currency
        };
    }catch(err){
        console.log(err);
        
        throw new Error(err.message);
    }
}

module.exports={setOrder,updateOrderStatus,createPayment};