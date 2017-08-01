const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase)

exports.sendInvites = functions.database.ref("/matches/{mid}/users").onWrite(event => {

        const users = event.data.current.val();
        const matchID = event.params["mid"]

        const promises = [];

        for(user in users) {
            promises.push(admin.database().ref("/users/" + user).once("value"))
        }

        return Promise.all(promises).then(results => {
            console.log("Results: " + results.toString());

            const userID = results[0].key;
            const token = results[0].child("token").val();
            
            const payload = {
                notification: {
                    title: "Se fai come Simone, non puoi certo sbagliar!",
                    body: "recipient: " + userID + ", match ID: " + matchID
                },
                data: {
                    match: matchID,
                    recipient: userID
                }
            };

            admin.messaging().sendToDevice(token, payload)
                .then(function (response) {
                    console.log("Successfully sent message:", response);
                })
                .catch(function (error) {
                    console.log("Error sending message:", error);
                });
        });


});

/*
exports.startMatch = functions.database.ref("/matches/{mid}/users").onUpdate(event => {

    const users = event.data;

    const colors = ["R", "G", "B", "Y"];

    for(user in users) {
        const col = random(colors);
        user.child("color").setValue(col);
        colors.remove(col);
    }


});*/