const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase)

exports.sendInvites = functions.database.ref("/matches/{mid}/users").onWrite(event => {

    const users = event.data.current.val();
    const matchID = event.params["mid"]

    const promises = [];

    for (user in users) {
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
var colors = ["RED", "YELLOW", "BLUE", "GREEN"];

// exports.setUpPlayerColors = functions.database.ref('/matchesTry/players/{pushID}').onCreate(event => {
//     const playerAdded = event.data.val();
//     console.log("EVENT DATA: ", playerAdded)
//     const object = { color: getColor(colors), taken: "false", start: "false" }

//     return event.data.ref.set(object)
// });

exports.countPlayersReady = functions.database.ref('/matchesTry/MATCHID/users/{playerID}/taken').onWrite(event => {
    const playerDbRef = event.data.ref.parent.parent
    playerCount = 0


    return playerDbRef.once('value').then(snapshot => {
        console.log("im about to loop baby", snapshot.val())
        snapshot.forEach(function (child) {
            console.log("parent ", child.key, " before incrementing ", child.child('taken').val(), " player count ", playerCount)

            if (child.child('taken').val() == "true") {
                playerCount++
                console.log("parent ", child.key, " after incrementing ", child.child('taken').val(), " player count ", playerCount)
            }

        });
        if (playerCount == 4) {
            var nuoviColors = ["RED", "YELLOW", "BLUE", "GREEN"];
            var sequence = { 1: "BLUE" }
            console.log("setting object sequence", sequence.toString())
            return playerDbRef.parent.child("CPUSequence").set(sequence)
        }
    })



});
exports.checkIfPlayersSequenceIsCorrect = functions.database.ref('/matchesTry/MATCHID/PlayersSequence/{colorAddedID}').onCreate(event => {
    var colorAdded = event.data
    console.log("color addeded ", colorAdded.val())
    const cpuSequenceRef = event.data.ref.parent.parent.child('CPUSequence').ref
    const sequenceIndexRef = event.data.ref.parent.parent.child('index').ref
    return cpuSequenceRef.once('value').then(snapshot => {
        console.log("examinating CpuSequence ", snapshot.val(), " ", snapshot.key, " ", snapshot.numChildren())
        snapshot.forEach(function (childSnapshot) { //loop through CPUSequence colors
            console.log("looping ", colorAdded.key, " ", childSnapshot.key)
            if (childSnapshot.key == colorAdded.key) {
                //checks if added color has the same index as the current child's
                if (childSnapshot.val() == colorAdded.val()) {
                    var index = Number(childSnapshot.key)
                    console.log("ok")
                    console.log("check statement ", index == snapshot.numChildren(), " index ", index, " numChildren ", snapshot.numChildren())
                    if (index == snapshot.numChildren()) { //
                        var nuoviColors = ["RED", "YELLOW", "BLUE", "GREEN"];
                        var newIndex = snapshot.numChildren() + 1
                        var newColor = { newIndex: getColor(nuoviColors) }
                        cpuSequenceRef.child(newIndex.toString()).set(getColor(nuoviColors))
                        sequenceIndexRef.set('0')

                        return event.data.ref.parent.set("empty")

                    }
                }
                else {
                    return event.data.ref.parent.set("wrong")
                }
            }
        })
    })
})

exports.setIndex = functions.database.ref('/matchesTry/MATCHID/index').onWrite(event => {
    console.log("index value ", event.data.val())
    const index = Number(event.data.val())
    if (index == 0) {
        return event.data.ref.set('1')
    }
});


function getColor(colors) {
    var color;
    do {
        color = colors[Math.floor((Math.random() * colors.length))]
    }
    while (color == null);
    const index = colors.indexOf(color);
    colors.splice(index, 1);
    return color;
}


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