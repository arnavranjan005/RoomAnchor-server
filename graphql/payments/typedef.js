const typeDefs=`#graphql
    type payment{
        orderId:String!
        amount:Int!
        currency:String!
}
`

module.exports={typeDefs}