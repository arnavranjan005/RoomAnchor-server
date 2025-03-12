const { redis } = require("../DB/connection.js");
const { setRoom } = require("../services/token/jwtToken.js");

const verify = async ({ q, r, t }, context) => {
    if (!context.User) throw new Error("Unauthorized");

    console.log("Rooooommmmmmm::::", context.Room, context.User.username);

    let room = await redis.hget(`users:${context.User.username}`, 'room');
    if (room) {
        room = room.split('_');
        const isOwner = await redis.hget(`Room:${room[0]}:owner`, 'owner');

        if (isOwner) {
            let token=null;
            if (!context.Room) {
                const isCreator = context.User.username === room[0];
                token = isCreator?setRoom(room[0], room[1], isCreator):setRoom(room[0], room[0]);
                context.res.cookie('prvRoom', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                    maxAge: isCreator ? undefined : 1000 * 60 * 60,
                });
            }

            return {
                username: context.User.username,
                url: context.User.url,
                roomId: room[0],
                roomType: room[1],
                token
            };
        } else {
            await redis.hdel(`users:${room[0]}`, 'room');
            if (context.Room) {
                context.res.cookie('prvRoom', "", {
                    expires: new Date(0),
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                });
            }
            return {
                username: context.User.username,
                url: context.User.url
            };
        }
    } else {
        if (q && r && t) {
            const roomLink = await redis.get(`Room:Link:${r}`);
            if (roomLink === q) {
                const isCreator = context.User.username === r;
                const token = setRoom(r, t, isCreator);
                await redis.hset(`users:${context.User.username}`, 'room', `${r}_${t}`);

                return {
                    username: context.User.username,
                    url: context.User.url,
                    roomId: r,
                    roomType: t,
                    token
                };
            }
        }
        // if (context.Room) {
        //     context.res.cookie('prvRoom', "", {
        //         expires: new Date(0),
        //         httpOnly: true,
        //         secure: true,
        //         sameSite: 'none',
        //     });
        // }
        return {
            username: context.User.username,
            url: context.User.url
        };
    }
}

module.exports={verify};