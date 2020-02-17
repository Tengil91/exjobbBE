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
  sockets[socket.id] = socket;
  socket.emit('connection', {})
  
  socket.on('disconnect', reason => {
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
    let registerError = [];
    if(data.username && data.username.length > 0 && data.password && data.password.length > 0){
      if(!users[data.username]){
        if(data.username.match(/[a-z,A-Z,0-9]*/)[0] === data.username){
          let token = generateToken();
          users[data.username] = {};
          users[data.username].password = data.password;
          users[data.username].games = [];
          users[data.username].wall = [];
          users[data.username].points = 1000;
          users[data.username].token = token;
          socket.username = data.username;
          socket.emit('logged in', {
            username: data.username,
            loggedIn: true,
            token,
            registerError: null
          });
        } else {
          registerError.push('Användarnamnet får innehålla bokstäver och siffror');
        }
      } else {
        registerError.push('Användarnamnet är upptaget!');
      }
    } else {
      registerError.push('Fyll i lösenord och användarnamn');
    }
    if(registerError.length > 0){
      socket.emit('register error', {registerError});
    }
  });

  socket.on('login', data => {
    let loggedIn = false;
    if(data.username && data.password){
      if(users[data.username] && users[data.username].password === data.password){
        socket.username = data.username;
        socket.emit('logged in', {
          username: data.username,
          loggedIn: true,
          token: users[data.username].token
        });
        loggedIn = true;
      }
    } else if(data.token && data.username){
      if(users[data.username] && users[data.username].token === data.token){
        socket.username = data.username;
        socket.emit('logged in', {
          username: data.username,
          loggedIn: true,
          token: users[data.username].token,
          loginError: null
        });
        loggedIn = true;
      }
    }
    if(!loggedIn && !data.token){
      socket.emit('login error', {loginError: 'Användarnamnet eller lösenordet är fel'});
    }
  });

  socket.on('logout', data => {
    socket.username = null
    socket.emit('logged in', {
      username: null,
      loggedIn: null
    });
  });

  socket.on('join user page', data => {
    let username = data.username;
    if(users[username]){
      socket.join(`user page:${data.username}`);
      socket.emit('user page update', {
        games: users[username].games,
        points: users[username].points,
        wall: users[username].wall
      });
    }
  });

  socket.on('leave user page', data => {
    socket.leave(`user page:${data.username}`);
  });

  socket.on('join users page', data => {
    outData = {
      users: getUsersSortedByRank()
    };
    socket.emit('users page update', outData);
  });

  socket.on('join room', data => {
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
      black: updatedPlayers.black ? updatedPlayers.black.username ? updatedPlayers.black.username : 'Gäst' : null,
      white: updatedPlayers.white ? updatedPlayers.white.username ? updatedPlayers.white.username : 'Gäst' : null,
      atTable: false,
    });
    socket.to(data.room).emit('table update', {
      black: updatedPlayers.black ? updatedPlayers.black.username ? updatedPlayers.black.username : 'Gäst' : null,
      white: updatedPlayers.white ? updatedPlayers.white.username ? updatedPlayers.white.username : 'Gäst' : null,
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
      redirect: {roomType: 'game', room: nextEmptyRoom}
    }
    socket.emit('room created', outData);
    socket.leave('landing page');
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
      let matt = rooms[data.room].game.getGameState().matt;
      if(matt && (player === 1 || player === 0)){
        rooms[data.room].game.handleFECalls({waitingToStartNewGame: player});
      } else if(rooms[data.room].game.playerTurn === player){
        rooms[data.room].game.handleFECalls(data);
        }
    }
  });

  socket.on('post to wall', data => {
    if(data.text && data.wallOwner && users[data.wallOwner]){
      if(data.text.length > 0){
        users[data.wallOwner].wall.unshift({
          text: data.text,
          username: socket.username,
          timestamp: (new Date()).getTime()
        });
      }
    }
    io.to(`user page:${data.wallOwner}`).emit('user page update', {
      games: users[data.wallOwner].games,
      points: users[data.wallOwner].points,
      wall: users[data.wallOwner].wall
    });
  });
});

server.listen(port);

function findNextEmptyRoom(rooms){
  let found = false;
  let keys = Object.keys(rooms);
  let i = 0;
  while(!found){
    if(!keys.includes(i + '')){
      found = true;
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
    if(rooms[room].game){
      if(rooms[room].game && (rooms[room].table.white === socket || rooms[room].table.black === socket)){
        if(!rooms[room].game.matt){
          //uppdatera ranking
          let playedVS = null;
          playedVS = rooms[room].table.white === socket ? 1 : 0;
          calculateNewRank(rooms[room].table.white, rooms[room].table.black, playedVS);
        }
        rooms[room].game = null;
      }
    }
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
      io.to(room).emit('table update', emitData);
      let landingPageData = {rooms: returnRoomData(rooms)};
      socket.to('landing page').emit('landing page update', landingPageData);
    }
  }
}

function calculateNewRank(white, black, winner){
  if(black.username && white.username){
    users[black.username].games.push({
      opponent: white.username,
      playedAs: 'svart',
      wonGame: winner === 1 ? true : false
    });
    users[white.username].games.push({
      opponent: black.username,
      playedAs: 'vit',
      wonGame: winner === 0 ? true : false
    });
    
    let pointDifference = Math.abs(users[black.username].points - users[white.username].points);
    let whiteIsHigherRanked = users[white.username].points - users[black.username].points > 0 ? true : false;
    let points = 0;
    if(winner === 1){
      if(whiteIsHigherRanked){
        points = 20 + pointDifference / 50;
      } else {
        points = 20 - pointDifference / 50;
      }
      points = points < 0 ? 0 : points;
      points = points > 100 ? 100 : points;
      points = Math.round(points);
      users[white.username].points -= points;
      users[black.username].points += points;
    } else {
      if(whiteIsHigherRanked){
        points = 20 - pointDifference / 50;
      } else {
        points = 20 + pointDifference / 50;
      }
      points = points < 0 ? 0 : points;
      points = points > 100 ? 100 : points;
      points = Math.round(points);
      users[black.username].points -= points;
      users[white.username].points += points;
    }
  }
}

function gameCallback(io, room, gameState){
  if(gameState.matt && gameState.waitingToStartNewGame[0] === false && gameState.waitingToStartNewGame[1] === false){
    let black = rooms[room].table.black;
    let white = rooms[room].table.white;
    calculateNewRank(white, black, gameState.checkedKing.color === 1 ? 0 : 1);
  } 
  if(gameState.matt && (gameState.waitingToStartNewGame[0] === true || gameState.waitingToStartNewGame[1] === true)){
    let waitingPlayer = gameState.waitingToStartNewGame[0] ? 'white' : 'black';
    rooms[room].table[waitingPlayer].emit('table update', {...gameState, waitingToStartNewGame: true});
  } else {
    if(gameState.selectedPiece){
      //skicka bara moves till spelaren vid draget.
      let player = gameState.playerTurn === 0 ? 'white' : 'black';
      rooms[room].table[player].emit('table update', {...gameState, waitingToStartNewGame: false});
    } else {
      io.to(room).emit('table update', {...gameState, waitingToStartNewGame: false});
    }
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
    //ta bort användaren från bordet
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

function getUsersSortedByRank(){
  let returnArray = getPlayersInArray();
  returnArray.sort((a, b) => {
    if (a.points < b.points) {
      return 1;
    }
    if (a.points > b.points) {
      return -1;
    }
    return 0;
  });
  return returnArray;
}

function getPlayersInArray(){
  return Object.entries(users).map(entry => {
    let user = {};
    user.username = entry[0];
    user.points = entry[1].points;
    return user;
  });
}

function generateToken(){
  let result = '';
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charactersLength = characters.length;
  for ( let i = 0; i < 20; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}