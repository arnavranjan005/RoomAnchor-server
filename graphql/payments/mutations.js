const mutations=`#graphql
createPayment(roomType:String!,roomSize:Int!):payment!
updateOrderStatus(orderId:String!,status:String!):String!
`

module.exports={mutations}