let express = require('express');
let app = express();
let { ChessBE } = require('./ChessBE');
const port = 3001;
let server = require('http').createServer(app);
let io = require('socket.io')(server);

let sockets = {};
let rooms = {};
let users = {};

io.on('connection', socket => {
  console.log('a user connected');
  sockets[socket.id] = socket;
  socket.emit('connection', {})
  
  socket.on('disconnect', reason => {
    console.log('user disconnected');
    sockets[socket.id] = null;
    let roomIndexes = getUsersRoomIndex(socket, rooms);
    roomIndexes.forEach(room => {
      removePlayerFromRoom(socket, room, io);
    });
  });

  socket.on('join landing page', data => {
    socket.join('landing page');
    let outData = {rooms: returnRoomData(rooms)};
    socket.emit('landing page update', outData);
  });

  socket.on('leave landing page', data => {
    socket.leave('landing page');
  });

  socket.on('register', data => {
    if(data.username && data.username.length > 0 && data.password && data.password.length > 0){
      if(!users[data.username]){
        users[data.username] = data.password;
        socket.username = data.username;
        socket.emit('logged in', {
          username: data.username,
          loggedIn: true
        });
      } else {
        socket.emit('register error', {error: ':('});
      }
    } else {
      socket.emit('register error', {error: ':('});
    }
  });

  socket.on('login', data => {
    console.log('login, data');
    console.log(data);
    if(data.username && data.password){
      if(users[data.username] && users[data.username] === data.password){
        socket.username = data.username;
        socket.emit('logged in', {
          username: data.username,
          loggedIn: true
        });
      } else {
        socket.emit('login error', {error: ':('});
      }
    } else {
      socket.emit('login error', {error: ':('});
    }
  });

  socket.on('logout', data => {
    socket.username = null
    socket.emit('logged in', {
      username: null,
      loggedIn: null
    });
  });

  socket.on('join room', data => {
    //Anslut till rum
    //Grejer som ska skickas:
    /*
      * spelare vid bordet
      * egen position: sitting/standing
      * gamestate: {
        currentlyPlaying: true/false
        (pieces)
        (check)
        (matt)
        ((moves) bara för spelaren vid draget)
      }
    */

    console.log('joined room');
    console.log(data);
    socket.join(data.room);
    let outData = {};
    if(data.roomType === 'game'){
      if(!rooms[data.room]){
        rooms[data.room] = {
          table: {
            white: null,
            black: null
          },
          users: []
        }
      }
      if(!rooms[data.room].users.includes(socket)){
        rooms[data.room].users.push(socket);
      }
      outData.atTable = playerIsAtTable(data.room, socket);
      outData.gamestate = getGameState(data.room, socket);
      let updatedPlayers = getBlackAndWhiteUsernames(data.room);
      outData = {
        ...outData,
        white: updatedPlayers.white,
        black: updatedPlayers.black,
      }
      if(rooms[data.room].game){
        outData = {...outData, ...rooms[data.room].game.getGameState()}
      }
      console.log('outData');
      console.log(outData);
      socket.emit('table update', outData);
    }

    socket.to(data.room).emit('user joined room', {username: 'username comming soonish'});
  });

  socket.on('join table', (data) => {
    //Kolla om plats finns
    //Lägg till som player
    //Grejer som ska skickas:
    /*
      * spelare vid bordet (till alla)
      * egen position: sitting/standing
    */
    //Kolla om alla spelplatser är fyllda. Om ja, starta spelet

    let players = getPlayersAroundTable(data.room);
    let color = data.color === 0 ? 'white' : 'black';
    if(players){
      if((!playerIsAtTable(data.room, socket)) && players[color] === null){
        console.log('joined table');
        rooms[data.room].table[color] = socket;
        let updatedPlayers = getBlackAndWhiteUsernames(data.room);
        let outDataToSocket = {
          black: updatedPlayers.black,
          white: updatedPlayers.white,
          atTable: playerIsAtTable(data.room, socket)
        };
        socket.emit('table update', outDataToSocket);
        socket.to(data.room).emit('table update', {
          black: updatedPlayers.black,
          white: updatedPlayers.white
        });
        let outDataToLandingPage = {rooms: returnRoomData(rooms)};
        socket.to('landing page').emit('landing page update', outDataToLandingPage);
        if(updatedPlayers.black && updatedPlayers.white && !rooms[data.room].game){
          rooms[data.room].game = new ChessBE(gameCallback, io, data.room);
        }
      }
    }
  });

  socket.on('leave table', (data) => {
    removePlayerFromTable(data.room, socket, io);
    let updatedPlayers = getPlayersAroundTable(data.room);
    socket.emit('table update', {
      black: updatedPlayers.black,
      white: updatedPlayers.white,
      atTable: false,
    });
    socket.to(data.room).emit('table update', {
      black: updatedPlayers.black,
      white: updatedPlayers.white,
    });
    let outDataToLandingPage = {rooms: returnRoomData(rooms)};
    socket.to('landing page').emit('landing page update', outDataToLandingPage);
  });

  socket.on('leave room', (data) => {
    removePlayerFromRoom(socket, data.room, io);
    socket.leave(data.room);
  });

  socket.on('new message', data => {
    socket.broadcast.to(data.room).emit('receive message', data);
  });

  socket.on('create room', data => {
    let nextEmptyRoom = findNextEmptyRoom(rooms);
    rooms[nextEmptyRoom] = {
      table: {
        white: socket,
        black: null
      },
      users: []
    }
    let outData = {
      room: nextEmptyRoom,
      white: socket.username ? socket.username : 'Gäst',
      black: null,
      atTable: true,
      redirect: {roomType: 'games', room: nextEmptyRoom}
    }
    socket.emit('room created', outData);
    let outDataToLandingPage = {rooms: returnRoomData(rooms)};
    socket.to('landing page').emit('landing page update', outDataToLandingPage);
  });

  socket.on('canvas click', data => {
    if(rooms[data.room].game){
      //kollar om klicket kommer från spelaren vid draget
      let player = null;
      if(rooms[data.room].table.black === socket){
        player = 1;
      }
      if(rooms[data.room].table.white === socket){
        player = 0;
      }
      if(rooms[data.room].game.playerTurn === player){
        rooms[data.room].game.handleFECalls(data);
      }
    }
  });
});

server.listen(port);

function findNextEmptyRoom(rooms){
  let keys = Object.keys(rooms);
  let i = 0;
  while(true){
    if(!keys.includes(i + '')){
      return i + '';
    }
    i++;
  }
}

function getPlayersAroundTable(room){
  return rooms[room] ? rooms[room].table : null;
}
//returnerar true om spelaren sitter vid bordet.
function playerIsAtTable(room, socket){
  if(rooms[room]){
    let players = rooms[room].table;
    if(players.black === socket || players.white === socket){
      return true;
    }
  }
  return false;
}


/* @TODO: returnerar
  gamestate: {
    currentlyPlaying: true/false
    (pieces)
    (check)
    (matt)
    ((moves) bara för spelaren vid draget)
    ((color) för båda spelarna)
  } */
function getGameState(room, socket){
  return {
    currentlyPlaying: false
  }
}

function removePlayerFromTable(room, socket, io){
  let check = false;
  if(rooms[room]){
    if(rooms[room].table.white === socket){
      rooms[room].table.white = null;
      check = true;
    }
    if(rooms[room].table.black === socket){
      rooms[room].table.black = null;
      check = true;
    }
    if(check){
      let emitData = getBlackAndWhiteUsernames(room);
      if(rooms[room].game){
        delete rooms[room].game;
        emitData = {
          ...emitData,
          pieces: null,
          checkingPieces: null,
          checkedKing: null,
          matt: null,
          selectedPiece: null,
          pawnCrossing: null,
          playerTurn: null,
        }
      }
      io.to(room).emit('table update', emitData);
      let landingPageData = {rooms: returnRoomData(rooms)};
      socket.to('landing page').emit('landing page update', landingPageData);
    }
  }
}

function gameCallback(io, room, gameState){
  if(gameState.selectedPiece){
    //skicka bara moves till spelaren vid draget.
    let player = gameState.playerTurn === 0 ? 'white' : 'black';
    rooms[room].table[player].emit('table update', gameState);
  } else {
    io.to(room).emit('table update', gameState);
  }
}

function returnRoomData(rooms){
  let outRooms = Object.keys(rooms).map(room => {
    return {
      room: room,
      players: getBlackAndWhiteUsernames(room)
    }
  });
  return outRooms;
}
//funktion för att hitta rummen som användaren är i
function getUsersRoomIndex(socket, rooms){
  let entries = Object.entries(rooms);
  entries = entries.filter(entry => (entry[1].users.includes(socket)));
  return entries.map(entry => (entry[0]));
}

//funktion för att hitta rummen som användaren är i och sitter vid ett bord
function getTableRoomIndex(socket, rooms){
  let entries = Object.entries(rooms);
  entries = entries.filter(entry => (entry[1].table.white === socket || entry[1].table.black === socket));
  return entries.map(entry => (entry[0]));
}

//funktion för att ta bort användaren från ett rum
function removePlayerFromRoom(socket, room, io){
  if(rooms[room] && rooms[room].users){
    if(rooms[room].users.includes(socket)){
      rooms[room].users.splice(rooms[room].users.indexOf(socket), 1);
      removePlayerFromTable(room, socket, io);
    }
    if(rooms[room].users.length === 0){
      delete rooms[room];
      let landingPageData = {rooms: returnRoomData(rooms)};
      socket.to('landing page').emit('landing page update', landingPageData);
    }
  }
}

function getBlackAndWhiteUsernames(room){
  let returnData = {};
  if(rooms[room]){
    if(rooms[room].table.white){
      returnData.white = rooms[room].table.white.username ? rooms[room].table.white.username : 'Gäst';
    } else {
      returnData.white = null;
    }
    if(rooms[room].table.black){
      returnData.black = rooms[room].table.black.username ? rooms[room].table.black.username : 'Gäst';
    } else {
      returnData.black = null;
    }
  }
  return returnData;
}