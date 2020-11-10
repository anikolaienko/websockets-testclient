function addHeader(event) {
    var newHeader = $(`
    <div>
        <label>Key:<label>
        <input type="text"></input>
        <label>Value:<label>
        <input type="text"></input>
    </div>
    `)
    $('#headers-list').append(newHeader)
}

function connectToWS(event) {
    event.preventDefault = true;
    console.log("Hey there")
}

/** Add a user to the list of connected users.*/
function addToUsersList(userId, isYou) {
    const newUserLi = $('<li id="users-list-' + userId + '"></li>');
    newUserLi.append(userId);
    if(isYou) {
        newUserLi.append($('<em> (you)</em>'));
    }
    $('#users').append(newUserLi);
}

/** Clear the users list. */
function clearUsersList() {
    $('#users').empty();
}

/** Add a user to the list of connected users and print an alert.*/
function addUser(userId) {
    console.log('Adding user to connected users list:', userId);
    addToUsersList(userId);
    addSystemMessage($('<span>User <strong>' + userId + '</strong> joined the room</span>'));
}

/** Remove a user from the list of connected users and print an alert.*/
function removeUser(userId) {
    console.log('Removing user from connected users list:', userId);
    $('li#users-list-' + userId).remove();
    addSystemMessage($('<span>User <strong>' + userId + '</strong> left the room</span>'));
}

/** Add a new chat message from a named user. */
function addChatMessage(userId, msg) {
    const newMessage = $('<div class="alert thin-alert" role="alert"></div>');
    const userSays = $('<strong>' + userId + ':  </strong>');
    if(userId === myUserId) {
        newMessage.addClass('alert-secondary');
    } else {
        newMessage.addClass('alert-info');
    }
    newMessage.append(userSays);
    newMessage.append(msg);
    $('#messages').append(newMessage);
}

/** Add a new system message (e.g. user joined/left) to the chat. */
function addSystemMessage(msg) {
    const newMessage = $('<div class="alert thin-alert alert-success" role="alert"></div>');
    newMessage.append(msg);
    $('#messages').append(newMessage);
}

/** Add a new error message to the chat. */
function addErrorMessage(msg) {
    const newMessage = $('<div class="alert thin-alert alert-danger" role="alert"></div>');
    newMessage.append(msg);
    $('#messages').append(newMessage);
}

/** Handle an incoming message from the websocket connection. */
function onWebsocketMessage(message) {
    console.log('Got message from websocket:', message);
    const payload = JSON.parse(message.data);
    switch(payload.type) {
        case 'MESSAGE':
            if(payload.data.user_id === 'server') {
                addSystemMessage(payload.data.msg);
            } else {
                addChatMessage(payload.data.user_id, payload.data.msg);
            }
            return;
        case 'USER_JOIN':
            addUser(payload.data);
            return;
        case 'USER_LEAVE':
            removeUser(payload.data);
            return;
        case 'ROOM_JOIN':
            myUserId = payload.data.user_id;
            addToUsersList(myUserId, true);
            return;
        case 'ROOM_KICK':
            addErrorMessage(payload.data.msg);
            clearUsersList();
            return;
        case 'ERROR':
            addErrorMessage(payload.data.msg);
            return;
        default:
            throw new TypeError('Unknown message type: ' + payload.type);
            return;
    }
}


function onClickFactory(websocket) {
    return function (event) {
        event.preventDefault();

        const $messageInput = $('#chat-input');
        const message = $messageInput.val();
        $messageInput.val('');
        if (!message) {
            return
        }

        websocket.send(message);
    }
}

/** Join up the 'submit' button to the websocket interface. */
function onWebsocketOpen(websocket) {
    console.log('Opening WebSocket connection');
    return function () {
        $('button[type="submit"]')
            .on('click', onClickFactory(websocket))
            .removeAttr('disabled');
    }
}

/** Print websocket errors into the chat box using addErrorMessage. */
function onWebsocketError(err) {
    console.error('Websocket error: ', err);
    addErrorMessage('Error:' + err, 'error');
    onWebsocketClose();
}

/** Disable the 'submit' button when the websocket connection closes. */
function onWebsocketClose() {
    console.log('Closing WebSocket connection');
    $('button[type="submit"]')
        .off('click')
        .attr('disabled', 'disabled');
}

/** On page load, open a websocket connection, and fetch the list of active users. */ 
$(function() {
    function reqListener () {
        const userData = JSON.parse(this.responseText);
        console.log('Received user list:', userData);
        userData.users.forEach(addToUsersList);
        $(function() {
            let myUserId = null;
            websocket = new WebSocket('ws://127.0.0.1:8000/ws');
            websocket.onopen = onWebsocketOpen(websocket);
            websocket.onerror = onWebsocketError;
            websocket.onclose = onWebsocketClose;
            websocket.onmessage = onWebsocketMessage;
        });
    }
    const oReq = new XMLHttpRequest();
    oReq.addEventListener("load", reqListener);
    oReq.open("GET", "http://localhost:8000/users");
    oReq.send();
});