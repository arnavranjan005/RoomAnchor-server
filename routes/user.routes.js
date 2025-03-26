const express = require("express");
const { redis } = require("../DB/connection.js");
const { userAuth } = require("../auth/userAuth.js");
const { upload, uploadProfile } = require("../middleware/multer.js");
const { handleUploadImg } = require("../controllers/user.js");
const { uploadImg_Cloudinary } = require("../services/cloudinary.js");
const { roomAuth } = require("../auth/roomAuth.js");
const { handleCookiedel } = require("../controllers/cookie.js");
const { handleVrifyPayment } = require("../webhook/razorpay.js");
const { isAuth } = require("../middleware/isuserAuth.js");
const router = express.Router();
let userRes={};

router.get('/',(req,res)=>{
    return res.json({msg:'active'})
});

router.post('/subscribe',async(req,res)=>{
    const {subscription}=req.body;
    console.log(subscription);
    
    const user=userAuth(req.cookies);
    if(!user) return res.status(401).json({msg:"Unauthorized"});
    try{
    await redis.hset(`users:${user.username}`,'token',JSON.stringify(subscription));
    return res.status(200).json({msg:"subscribed"});
    }catch(err){
        console.log(err);
        return res.status(500).json({msg:"Internal server error"});
    }
})

router.post('/uploadImg',isAuth,uploadProfile.single('avatarImg'),handleUploadImg);

router.post('/uploadInroom',isAuth,
    (req,res,next)=>{
        const room=roomAuth(req.cookies);
        if(!room) return res.status(401).json({msg:"Unauthorized"});
        next();
    },
    upload.single('file'),async(req,res)=>{
    try{
    const url=await uploadImg_Cloudinary(req.file.path);
    return res.status(200).json({url});
    }catch(err){
        console.log(err);
        return res.status(500).json({msg:"Internal server error"});
    }
});

router.get('/events',async(req,res)=>{
    try{
        const user=userAuth(req.cookies);
        if(!user) return res.status(401).json("Unauthorized");
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        userRes={...userRes,...{[user.username]:res}};
        
        if(userRes[user.username]?.roomSize) res.write(`data: ${JSON.stringify({roomType:'video',roomSize:userRes[user.username].roomSize})}\n\n`);
        
        req.on('close',()=>{
            delete userRes[user.username];
        });
    }
    catch(err){
        console.log(err);
        return res.status(500).json({msg:"Internal server error"});
    }
});

router.post('/kicked',handleCookiedel);
router.post('/destroy',handleCookiedel);
router.post('/leave',handleCookiedel);
router.post('/webhook',(req,res)=>handleVrifyPayment({req,res,userRes}));

module.exports = router;
