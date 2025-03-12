require("dotenv").config();
const express = require("express");
const cors=require("cors");
const {cookieParser}=require("cookie-string-parser");
const {expressMiddleware}=require('@apollo/server/express4')
const router = require("./routes/user.routes");
const { createApolloGraphqlServer } = require("./graphql");
const { userAuth } = require("./auth/userAuth");
const { roomAuth } = require("./auth/roomAuth");

async function init() {
const PORT = process.env.PORT;

const app = express();

app.use(cors({
    origin:[`${process.env.CLIENT_URL}`,`${process.env.CONNECTION_URL}`],
    credentials:true
}));

app.use(cookieParser);
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use('/graphql',
  expressMiddleware(await createApolloGraphqlServer(),{
  context: async({req,res})=>{
    
  const User= userAuth(req.cookies);
  const Room= roomAuth(req.cookies);
  
  if(!User)
    return {req,res};
  if(!Room)
    return {req,res,User};

  return {req,res,User,Room};
  },
})
);

app.use('/',router);

app.use((err, req, res, next) => {
  console.log(req.query);
  
  if (err.code === "LIMIT_FILE_SIZE") {
    res.status(413).send("File is too large!");
  } else {
    console.error("Unhandled error:", err);
    res.status(500).send("An error occurred!");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
})
}

init().catch((err) => {
  console.error(err);
})