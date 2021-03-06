const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase)

/*exports.sendNotification = functions.database.ref("/multiplayer/{mid}").onUpdate(event => {

    const firstplayer = event.data.current.child("firstplayer").child("id").val()
    const secondplayer = event.data.current.child("secondplayer").child("id").val()
    const matchID = event.params["mid"]

    const promises = [];

    console.log("Firstplayer ID:", "/users/" + firstplayer);
    console.log("Secondplayer ID:", "/users/" + secondplayer);
    promises.push(admin.database().ref("/users/" + firstplayer).once("value"))
    promises.push(admin.database().ref("/users/" + secondplayer).once("value"))
    

    return Promise.all(promises).then(results => {
        console.log("Results: " + results.toString());

        const userID = results[0].key;
        const token = results[0].child("token").val();

        const payload = {
            notification: {
                title: "You've got a new Simone challenge!",
                body: "recipient: " + userID + ", match ID: " + matchID,
                click_action: "android.intent.action.MAIN"
            },
        };

        admin.messaging().sendToDevice(token, payload)
            .then(function (response) {
                console.log("Successfully sent notification:", response);
            })
            .catch(function (error) {
                console.log("Error sending message:", error);
            });
    });
});*/



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
    const users = event.data.previous.child("users").ref;

    console.log("Users: " + users);

    for(user in users.child()) {
        admin.database().ref("/users/" + user.key + "/matches/" + matchID).remove;
    }
});



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

        if (playersCount == 4) { //set players colors
            var colors = ["RED", "YELLOW", "BLUE", "GREEN"];
            var firstRandom = randomIn(colors)
            var sequence = { 1: firstRandom }
            console.log("setting object sequence", sequence.toString())

            snapshot.forEach(function(child) {
                const col = randomIn(colors)
                console.log("Color: " + col + ", remaining: " + colors)
                child.child('color').ref.set(col)
                colors = colors.filter(item => item !== col)
            })

            playerDbRef.parent.child("status").ref.set("Simone's turn")
       
            var blinkRef = playerDbRef.parent.child("blink").ref
            resetBlinkingIndex(firstRandom, blinkRef)

            return playerDbRef.parent.child("cpuSequence").set(sequence)
        }
    })

});


function resetBlinkingIndex(nextColor, blinkRef) {
    console.log('Trying to resetting index to ' + nextColor)
    
    blinkRef.set({color: 'RST',index: '0'})
    blinkRef.set({color: nextColor,index: '1'})
}

function randomIn(array) {
    return array[Math.floor((Math.random() * array.length))]
}

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

exports.checkIfPlayersSequenceIsCorrect = functions.database.ref('/matches/{matchID}/playersSequence/{colorAddedID}').onCreate(event => {
    var colorAdded = event.data
    const cpuSequenceRef = event.data.ref.parent.parent.child('cpuSequence').ref
    const blinkRef = event.data.ref.parent.parent.child('blink').ref
    return cpuSequenceRef.once('value').then(snapshot => {
        snapshot.forEach(function (childSnapshot) { //loop through CPUSequence colors
          console.log("looping ", colorAdded.key, " ", childSnapshot.key)
            if (childSnapshot.key == colorAdded.key) {
                //checks if added color has the same index as the current child's

                if (childSnapshot.val() == colorAdded.val()) {
                    var index = Number(childSnapshot.key)
                   
                    if (index == snapshot.numChildren()) { //
                        var newColors = ["RED", "YELLOW", "BLUE", "GREEN"];
                        var newIndex = snapshot.numChildren() + 1
                        var col = getColor(newColors)
                        var newColor = { newIndex: col }
                        cpuSequenceRef.child(newIndex.toString()).set(getColor(newColors))

                        //Empty
                        event.data.ref.parent.set("playing")
                        event.data.ref.parent.parent.child("status").set("cpu turn")
                        resetBlinkingIndex(snapshot.child('1').val(), blinkRef) 

                        return 
                    }
                }
                else {
                    //Wrong
                    event.data.ref.parent.parent.child("status").set({case:"wrong",color:colorAdded.val()})
                }
            }
        })
    })
})
