const { userAuth } = require("../auth/userAuth");

const isAuth=(req,res,next)=>{
    const user=userAuth(req.cookies);
    if(!user) return res.status(401).send("Unauthorized");
    if(!user.username) return res.status(401).send("Unauthorized");
    req.user=user;
    next();
};

module.exports={isAuth};