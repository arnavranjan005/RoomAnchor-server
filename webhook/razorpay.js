const crypto = require('crypto');
const { redis } = require('../DB/connection');
const { updateOrderStatus, getUser } = require('../controllers/user');
const { default: axios } = require('axios');

const handleVrifyPayment = async ({req, res,userRes}) => {
    try{
    const recived_signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const generated_signature = crypto.createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('base64');
    if (recived_signature !== generated_signature) {
        return res.status(400).send('Invalid payment');
    }
    const event=req.body;
    const paymentEntity = event.payload.payment.entity;
        console.log(paymentEntity);
    const orderId=paymentEntity.notes.Order_id;
    const amount=paymentEntity.amount;
    const currency=paymentEntity.currency;
    const username=paymentEntity.receipt.split('_')[0];
    const roomType=paymentEntity.receipt.split('_')[1];
    const roomSize=paymentEntity.notes.roomSize;
    if(event.event==="payment.captured"){
    userRes[username]={...userRes[username],roomSize};
    await redis.hset(`users:${username}`,'paid',true);
    await redis.hset(`Room:${User.username}:roomSize`,'roomSize',roomSize);
    await redis.hset(`Room:${User.username}:roomType`,'roomType',roomType);
    userRes[username].write(`data: ${JSON.stringify({roomType,roomSize})}\n\n`);
    await updateOrderStatus({orderId,status:'paid'});
    const email=await getUser({username}).email;
    await axios.post(`${process.env.QUEUE_URL}/send-mail`,{
        email,
        body:`
            <h2>Payment Successful!</h2>
            <p>Thank you for your payment.</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Amount Paid:</strong> ${currency} ${amount} for room size ${roomSize},
            Now you can create room</p>
        `,
        subject:'Payment Successful',
    },{
    withCredentials:true,
    headers: {
        'x-api-key': process.env.CREDENTIAL_KEY
    }
    });

    return res.status(200).send('Payment verified');
    }
    else if(event.event==="payment.failed"){
        userRes[username].write(`data: Payment Failed\n\n`);
        await updateOrderStatus({orderId,status:'failed'});
        await redis.hdel(`users:${username}`,'paid');
        
    await axios.post(`${process.env.QUEUE_URL}/send-mail`,{
        email,
        body:`
            <h2>Payment Failed</h2>
            <p>Unfortunately, your payment could not be processed.</p>
            <p><strong>Order ID:</strong> ${orderId}</p>
        `,
        subject:'Payment Error Alert',
    },{
    withCredentials:true,
    headers: {
        'x-api-key': process.env.CREDENTIAL_KEY
    }
    });
        return;
    }
    }catch(err){
        console.log(err);
        return res.status(500).send("Internal server error");
    }
};

module.exports = { handleVrifyPayment };
