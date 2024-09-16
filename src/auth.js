import dbconnection from "./connection.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

(async () => {
    await (await dbconnection("Users")).createIndex({email: 1}, {unique:true});
})();

export default{ 
    async registerUser(userData){
        let db = await dbconnection("Users");
        let doc ={
            email: userData.email,
            isAdmin:userData.admin || false,
            password: await bcrypt.hash(userData.password, 8)
        };
        try{
       let result = await db.insertOne(doc);
       if (result && result.insertedId){
           return result.insertedId;
       }
        console.log(userData);
        }catch(e){
            if(e.code == 11000){
                throw new Error("User alredy exists");
            }
            console.log(e.code);
        }

    },
    async authencticateUser(email, password){
        let db = await dbconnection("Users");
        let user = await db.findOne({email:email});

        if(user &&  user.password && (await bcrypt.compare(password, user.password))){
            console.log(password)
            delete user.password
            let token = jwt.sign(user, process.env.JWT_SECRET, {
                algorithm: "HS512",
                expiresIn : "365d"
            });
            return {
                token,
                email:user.email,
                isAdmin:user.isAdmin
            };
        }
        else{
            throw new Error("Cannot auth!")
        }
    },
    verify(req,res, next){
        try{
        let authirization = req.headers.authorization.split(" ");
        let type = authirization[0];
        let token = authirization[1];

        if (type !== "Bearer"){
          return res.status(401).send();
        } else{
          req.jwt = jwt.verify(token, process.env.JWT_SECRET);
          return next();
        }
    }
    catch(e){
        return res.status(401).send();
    }
    }

};