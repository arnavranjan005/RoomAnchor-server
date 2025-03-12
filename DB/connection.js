const  Redis=require('ioredis');
const {driver, auth}=require('neo4j-driver');
const {Pinecone}=require('@pinecone-database/pinecone')

const Driver=driver(
    process.env.NEO4J_URI,
    auth.basic(
        process.env.NEO4J_USERNAME,
        process.env.NEO4J_PASSWORD
));

const redis=new Redis(process.env.REDIS_URL);

const pc=new Pinecone({
    apiKey:process.env.PINECONE_API_KEY,
});

module.exports={Driver,redis,pc}