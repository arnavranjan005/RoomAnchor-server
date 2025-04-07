const express = require("express");
const { redis, Driver } = require("../DB/connection.js");
const { userAuth } = require("../auth/userAuth.js");
const { upload, uploadProfile } = require("../middleware/multer.js");
const { handleUploadImg } = require("../controllers/user.js");
const { uploadImg_Cloudinary } = require("../services/cloudinary.js");
const { roomAuth } = require("../auth/roomAuth.js");
const { handleCookiedel } = require("../controllers/cookie.js");
const { handleVrifyPayment } = require("../webhook/razorpay.js");
const { isAuth } = require("../middleware/isuserAuth.js");
const crypto = require('crypto');
const router = express.Router();
let userRes = {};

router.get('/', (req, res) => {
    return res.json({ msg: 'active' })
});

router.post('/subscribe', async (req, res) => {
    const { subscription } = req.body;
    console.log(subscription);

    const user = userAuth(req.cookies);
    if (!user) return res.status(401).json({ msg: "Unauthorized" });
    try {
        await redis.hset(`users:${user.username}`, 'token', JSON.stringify(subscription));
        return res.status(200).json({ msg: "subscribed" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ msg: "Internal server error" });
    }
})

router.post('/uploadImg', isAuth, uploadProfile.single('avatarImg'), handleUploadImg);

router.post('/uploadInroom', isAuth,
    (req, res, next) => {
        const room = roomAuth(req.cookies);
        if (!room) return res.status(401).json({ msg: "Unauthorized" });
        next();
    },
    upload.single('file'), async (req, res) => {
        try {
            const url = await uploadImg_Cloudinary(req.file.path);
            return res.status(200).json({ url });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ msg: "Internal server error" });
        }
    });

router.get('/events', async (req, res) => {
    try {
        const user = userAuth(req.cookies);
        if (!user) return res.status(401).json("Unauthorized");
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        userRes = { ...userRes, ...{ [user.username]: res } };

        if (userRes[user.username]?.roomSize) res.write(`data: ${JSON.stringify({ roomType: 'video', roomSize: userRes[user.username].roomSize })}\n\n`);

        req.on('close', () => {
            delete userRes[user.username];
        });
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ msg: "Internal server error" });
    }
});

router.post('/kicked', handleCookiedel);
router.post('/destroy', handleCookiedel);
router.post('/leave', handleCookiedel);

// router.get('/payment/:subscribeplan',async(req,res)=>{
//     try{
//     const user=userAuth(req.cookies);
//     if(!user) return res.status(401).json({msg:"Unauthorized"});

//     const {subscribeplan}=req.params;
//     if(!['standard','premium','elite','vip'].includes(subscribeplan)) return res.status(400).json({msg:"Invalid plan"});

//     if(await redis.hget(`users:${user.username}`,'subscribPlan')) return res.status(400).json({msg:"Already subscribed"});

//     if(await redis.get(`users:${user.username}:paymentToken`)) return res.status(400).json({msg:"user already has payment token. Please try again after 5 minutes"});
//     await redis.set(`users:${user.username}:paymentToken`,subscribeplan,'EX',60*5);

//     const Payment_url='https://api.phonepe.com/apis/hermes';
//     return res.status(200).json({msg:"Payment initiated"});
//     }
//     catch(err){
//         console.log(err);
//         return res.status(500).send(err.message);
//     }
// });

// router.post('/payment',async(req,res)=>{
//     try{
//     const user=userAuth(req.cookies);
//     if(!user) return res.status(401).json({msg:"Unauthorized"});

//     if(!req.body.paymentId?.length) return res.status(400).json({msg:"Invalid payment id"});
//     const {paymentId}=req.body;
//     const plan=await redis.get(`users:${user.username}:paymentToken`);
//     if(!plan) return res.status(400).json({msg:"Invalid token"});
//     await Driver.executeQuery(`
//         MERGE (u:User {usernameusername})-[:ORDER]->(o:Order{paymentId:$paymentId,plan:$plan,status:'pending',createdAt:$date})
//     `,{
//         username:user.username,
//         paymentId,
//         plan,
//         date:new Date().toISOString()
//     });
//     }
//     catch(err){
//         console.log(err);
//         return res.status(500).json(err.message);
//     }
// })
router.get('/payment', async (req, res) => {
    try {
        const MERCHANT_ID = 'M22RQ3XNVMMK6';
        const SALT_KEY = 'ed8980dc-b208-4281-a825-a3dc38d74364';

        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', 'SU2504032024462215760316');
        params.append('client_secret', SALT_KEY);
        params.append('client_version', 1);
        let authToken = await fetch(`https://api.phonepe.com/apis/identity-manager/v1/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });
        authToken = await authToken.json();
        const { access_token } = authToken;
        console.log(authToken);
        let resapi = await fetch('https://api.phonepe.com/apis/pg/subscriptions/v2/setup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `O-Bearer ${access_token}`
            },
            body: JSON.stringify({
                "merchantOrderId": "MO144370902565893_2",
                "amount": 200,
                "paymentFlow": {
                    "type": "SUBSCRIPTION_SETUP",
                    "merchantSubscriptionId": "MS1709025658932",
                    "authWorkflowType": "TRANSACTION",
                    "amountType": "FIXED",
                    "maxAmount": 200,
                    "frequency": "ON_DEMAND",
                    "paymentMode": {
                        "type": "UPI_INTENT",
                        "targetApp": "com.phonepe.app"
                    },
                    "deviceContext": {
                        "deviceOS": "ANDROID"
                    }
                }
            })
        })
        resapi = await resapi.json();
        console.log(resapi);
        return res.status(200).json(resapi);
    }
    catch (err) {
        console.log(err);
        return res.status(500).json(err.message);
    }
})
router.post('/webhook', (req, res) => handleVrifyPayment({ req, res, userRes }));

module.exports = router;
