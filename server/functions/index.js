const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { user } = require("firebase-functions/v1/auth");

const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

exports.validateToken = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Check if Authorization header is present
    const authorizationHeader = req.get("Authorization");

    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Extract the token
    const token = authorizationHeader.split("Bearer ")[1];

    // Verify the JWT token
    try {
      let userData;
      const decodedToken = await admin.auth().verifyIdToken(token);
      if (decodedToken) {
        const docRef = db.collection("users").doc(decodedToken.uid);
        const doc = await docRef.get();
        if (!doc.exists) {
          const userRef = await db.collection("users").doc(decodedToken.uid);
          userData = decodedToken;
          userData.role = "member";
          await userRef.set(userData);
          return res.status(200).json({ success: true, user: userData });
        } else {
          return res.status(200).json({ success: true, user: decodedToken });
        }
      }
    } catch (error) {
      console.log("Error on validationg: ", error);
      return res
        .status(402)
        .json({ error: error.message, status: "un-authorized" });
    }
  });
});
//function to save app data to cloud
exports.createNewApp = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const data = req.body;
      const docRef = db.collection("apps").doc(req.body._id);
      await docRef.set(data);
      //retrive data from cloud
      const appDetail = await docRef.get();
      res.status(200).json({ _id: docRef.id, data: appDetail.data() });
    } catch (error) {
      return res.status(402).json({ error: error.message });
    }
  });
});

//function to get all the apps from cloud
exports.getAllApps=functions.https.onRequest((req,res)=>{
  cors(req,res,async()=>{
    try{
      const apps=[];
      //use onsnapshots to listen rea-time changes
      const unsubscribe=db
      .collection("apps")
      .orderBy("timestamp",'desc')
      .onSnapshot((snapShot)=>{
        apps.length=0//clear existing array
        snapShot.forEach(doc=>{
          apps.push(doc.data())
        })
        res.json(apps)
      });
      res.on('finish',unsubscribe)
    }catch(error){
      return res.status(402).json({error:error.message});
    }
  })
})

//function to delete an app from cloud
exports.deleteAnApp=functions.https.onRequest(async(req,res)=>{
  cors(req,res,async()=>{
    try{
      const {id}=req.query;
      if(!id){
        return res.status(400).json({error:"App Id is Missing"});
      }
      await db.collection("apps").doc(id).delete();
      return res.status(200).json({message:"App Deleted Successfully"});

    }catch(error){
      return res.status(402).json({error:error.message});
    }
  })
})

//function to retrive users from cloud
exports.getAllUsers=functions.https.onRequest(async(req,res)=>{
  cors(req,res,async()=>{
    try{
      const snapShot=await db.collection("users").get();
      const users=[];
      snapShot.forEach(doc=>{
        users.push(doc.data())
      })
      return res.status(200).json(users);
    }
    catch(error){
      return res.status(402).json({error:error.message});
    }
  })
})

//function to update user role
exports.updateTheUser=functions.https.onRequest(async(req,res)=>{
  cors(req,res,async()=>{
    try{
      const{_id,...data}=req.body;
      await db.collection("users").doc(_id).update(data)
      return res.status(200).json({message:"Use Updated Successfully"})
    }catch(error){
      return res.status(402).json({error:error.message});
    }
  })
})