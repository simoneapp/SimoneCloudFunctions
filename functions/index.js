const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase)

exports.sendInvites = functions.database.ref("/matches/{mid}/users").onCreate(event => {

    const users = event.data.current.val();
    const matchID = event.params["mid"]

    const promises = [];

    for (user in users) {
        promises.push(admin.database().ref("/users/" + user).once("value"))
        admin.database().ref("/users/" + user + "/matches/" + matchID).set(admin.database.ServerValue.TIMESTAMP)
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

exports.deleteMatches = functions.database.ref("/matches/{mid}").onDelete(event => {

    const matchID = event.params["mid"];
    const users = event.data.previous.child("users");

    console.log("Users: " + users);

    for(user in users.child()) {
        admin.database().ref("/users/" + user.key + "/matches/" + matchID).remove;
    }
});

var colors = ["RED", "YELLOW", "BLUE", "GREEN"];

// exports.setUpPlayerColors = functions.database.ref('/matchesTry/players/{pushID}').onCreate(event => {
//     const playerAdded = event.data.val();
//     console.log("EVENT DATA: ", playerAdded)
//     const object = { color: getColor(colors), taken: "false", start: "false" }

//     return event.data.ref.set(object)
// });

exports.countPlayersReady = functions.database.ref('/matches/{matchID}/users/{playerID}/taken').onWrite(event => {
    const playerDbRef = event.data.ref.parent.parent
    playersCount = 0

    return playerDbRef.once('value').then(snapshot => {
        console.log("im about to loop baby", snapshot.val())
        snapshot.forEach(function (child) {
            console.log("parent ", child.key, " before incrementing ", child.child('taken').val(), " player count ", playersCount)

            if (child.child('taken').val() == true) {
                playersCount++
                console.log("parent ", child.key, " after incrementing ", child.child('taken').val(), " player count ", playersCount)
            }

        });

        if (playersCount == 4) {
            var newColors = ["RED", "YELLOW", "BLUE", "GREEN"];
            var sequence = { 1: "BLUE" }
            console.log("setting object sequence", sequence.toString())
            return playerDbRef.parent.child("cpuSequence").set(sequence)
        }
    })

});

exports.checkIfPlayersSequenceIsCorrect = functions.database.ref('/matches/{matchID}/playersSequence/{colorAddedID}').onCreate(event => {
    var colorAdded = event.data
    console.log("color addeded ", colorAdded.val())
    const cpuSequenceRef = event.data.ref.parent.parent.child('cpuSequence').ref
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
                        var newColors = ["RED", "YELLOW", "BLUE", "GREEN"];
                        var newIndex = snapshot.numChildren() + 1
                        var newColor = { newIndex: getColor(newColors) }
                        cpuSequenceRef.child(newIndex.toString()).set(getColor(newColors))
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

exports.setIndex = functions.database.ref('/matches/{matchID}/index').onWrite(event => {
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
