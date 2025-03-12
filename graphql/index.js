const {ApolloServer}=require('@apollo/server')
const {User}=require('./users/index');
const {Room}=require('./rooms/index');
const {Payment}=require('./payments/index');
const { Post } = require('./posts');

const createApolloGraphqlServer=async()=>{
    const graphqlServer=new ApolloServer({
        typeDefs:`#graphql
            ${Post.typeDefs}
            ${User.typeDefs}
            ${Room.typeDefs}
            ${Payment.typeDefs}
            type Query {
                ${Post.queries}
                ${User.queries}
                ${Room.queries}
                ${Payment.queries}
            }
            type Mutation {
                ${Post.mutations}
                ${User.mutations}
                ${Room.mutations}
                ${Payment.mutations}
            }
        `,
        resolvers: {
            Query: {
                ...Post.resolvers.queries,
                ...User.resolvers.queries,
                ...Room.resolvers.queries,
                ...Payment.resolvers.queries
            },
            Mutation: {
                ...Post.resolvers.mutation,
                ...User.resolvers.mutation,
                ...Room.resolvers.mutation,
                ...Payment.resolvers.mutation
            }
        },
    });

    try{
    await graphqlServer.start();
    }
    catch(err){
        console.log(err);
    }
    return graphqlServer
}

module.exports={createApolloGraphqlServer}