exports.ChessBE = class ChessBE {
  constructor(gameCallback, io, room){
    this.gameCallback = gameCallback;
    this.io = io;
    this.room = room;
    this.playerCount = 2;
    this.piecesIndex = {
      bishopB: 'bishopB',
      bishopW: 'bishopW',
      kingB: 'kingB',
      kingW: 'kingW',
      knightB: 'knightB',
      knightW: 'knightW',
      pawnB: 'pawnB',
      pawnW: 'pawnW',
      queenB: 'queenB',
      queenW: 'queenW',
      rookB: 'rookB',
      rookW: 'rookW'
    }
    this.setupNewGame();
  }

  setupNewGame(){
    this.playerTurn = 0;
    this.drawsMade = [];
    this.checkingPieces = [];
    this.selectedPiece = null;
    this.checkedKing = null;
    this.matt = false;
    this.pawnCrossing = false;
    this.waitingToStartNewGame = [false, false]
    this.pieces = [
      {
        x: 0,
        y: 0,
        type: this.piecesIndex.rookB,
        color: 1
      },
      {
        x: 1,
        y: 0,
        type: this.piecesIndex.knightB,
        color: 1
      },
      {
        x: 2,
        y: 0,
        type: this.piecesIndex.bishopB,
        color: 1
      },
      {
        x: 3,
        y: 0,
        type: this.piecesIndex.queenB,
        color: 1
      },
      {
        x: 4,
        y: 0,
        type: this.piecesIndex.kingB,
        color: 1
      },
      {
        x: 5,
        y: 0,
        type: this.piecesIndex.bishopB,
        color: 1
      },
      {
        x: 6,
        y: 0,
        type: this.piecesIndex.knightB,
        color: 1
      },
      {
        x: 7,
        y: 0,
        type: this.piecesIndex.rookB,
        color: 1
      },
      {
        x: 0,
        y: 1,
        type: this.piecesIndex.pawnB,
        color: 1
      },
      {
        x: 1,
        y: 1,
        type: this.piecesIndex.pawnB,
        color: 1
      },
      {
        x: 2,
        y: 1,
        type: this.piecesIndex.pawnB,
        color: 1
      },
      {
        x: 3,
        y: 1,
        type: this.piecesIndex.pawnB,
        color: 1
      },
      {
        x: 4,
        y: 1,
        type: this.piecesIndex.pawnB,
        color: 1
      },
      {
        x: 5,
        y: 1,
        type: this.piecesIndex.pawnB,
        color: 1
      },
      {
        x: 6,
        y: 1,
        type: this.piecesIndex.pawnB,
        color: 1
      },
      {
        x: 7,
        y: 1,
        type: this.piecesIndex.pawnB,
        color: 1
      },
      {
        x: 0,
        y: 6,
        type: this.piecesIndex.pawnW,
        color: 0
      },
      {
        x: 1,
        y: 6,
        type: this.piecesIndex.pawnW,
        color: 0
      },
      {
        x: 2,
        y: 6,
        type: this.piecesIndex.pawnW,
        color: 0
      },
      {
        x: 3,
        y: 6,
        type: this.piecesIndex.pawnW,
        color: 0
      },
      {
        x: 4,
        y: 6,
        type: this.piecesIndex.pawnW,
        color: 0
      },
      {
        x: 5,
        y: 6,
        type: this.piecesIndex.pawnW,
        color: 0
      },
      {
        x: 6,
        y: 6,
        type: this.piecesIndex.pawnW,
        color: 0
      },
      {
        x: 7,
        y: 6,
        type: this.piecesIndex.pawnW,
        color: 0
      },
      {
        x: 0,
        y: 7,
        type: this.piecesIndex.rookW,
        color: 0
      },
      {
        x: 1,
        y: 7,
        type: this.piecesIndex.knightW,
        color: 0
      },
      {
        x: 2,
        y: 7,
        type: this.piecesIndex.bishopW,
        color: 0
      },
      {
        x: 3,
        y: 7,
        type: this.piecesIndex.queenW,
        color: 0
      },
      {
        x: 4,
        y: 7,
        type: this.piecesIndex.kingW,
        color: 0
      },
      {
        x: 5,
        y: 7,
        type: this.piecesIndex.bishopW,
        color: 0
      },
      {
        x: 6,
        y: 7,
        type: this.piecesIndex.knightW,
        color: 0
      },
      {
        x: 7,
        y: 7,
        type: this.piecesIndex.rookW,
        color: 0
      },
    ];
    this.gameCallback(this.io, this.room, this.getGameState());
  }

  getGameState(){
    return {
      pieces: this.pieces,
      checkingPieces: this.checkingPieces,
      checkedKing: this.checkedKing,
      matt: this.matt,
      selectedPiece: this.selectedPiece,
      pawnCrossing: this.pawnCrossing,
      playerTurn: this.playerTurn,
      waitingToStartNewGame: this.waitingToStartNewGame
    }
  }

  handleFECalls(callData){
    let {x, y, waitingToStartNewGame} = callData;
    if(this.matt){
      if(waitingToStartNewGame === 1 || waitingToStartNewGame === 0){
        this.waitingToStartNewGame[waitingToStartNewGame] = true;
        if(this.waitingToStartNewGame[0] && this.waitingToStartNewGame[1]){
          this.setupNewGame();
        }
      }
    } else if(this.pawnCrossing){
      let piece = this.selectPieceFromCrossingPawn(x, y, this.pawnCrossing.x, this.pawnCrossing.y, this.playerTurn);
      if(piece){
        let pieces = this.copy(this.pieces);
        this.pieces = this.swapPiece(pieces, piece);
        this.pawnCrossing = false;
        let {checkingPieces, checkedKing} = this.checkChecker(this.pieces, (this.playerTurn + 1) % 2);
        this.checkingPieces = checkingPieces;
        this.checkedKing = checkedKing;
        if(this.checkingPieces.length > 0){
          this.matt = this.mattChecker();
        }
        this.drawsMade.push({
          piece
        });
        this.changePlayerTurn();
      }
    } else if(this.selectedPiece){
      if(this.validateMove(x, y)){
        let move = this.selectedPiece.moves.find(piece => (piece.x === x && piece.y === y));
        this.pieces = this.movePiece(this.selectedPiece, this.pieces, move);
        let pawnCrossing = this.checkPawnCrossing(this.pieces);
        if(pawnCrossing){
          this.pawnCrossing = pawnCrossing;
        } else {
          let {checkingPieces, checkedKing} = this.checkChecker(this.pieces, (this.playerTurn + 1) % 2);
          this.checkingPieces = checkingPieces;
          this.checkedKing = checkedKing;
          if(this.checkingPieces.length > 0){
            this.matt = this.mattChecker();
          }
          this.changePlayerTurn();
        }
        this.drawsMade.push({
          x,
          y,
          type: this.selectedPiece.type,
          from: {x: this.selectedPiece.x, y: this.selectedPiece.y}
        });
        if(move.rokad){
          this.drawsMade[this.drawsMade.length - 1].rokad = true;
        }
        if(pawnCrossing){
          this.drawsMade[this.drawsMade.length - 1].pawnCrossing = true;
        }
        if(this.checkedKing){
          this.drawsMade[this.drawsMade.length - 1].check = true;
        }
        if(this.matt){
          this.drawsMade[this.drawsMade.length - 1].matt = true;
        }
        this.selectedPiece = null;
      } else {
        this.selectedPiece = this.selectPiece(x, y);
      }
    } else {
      this.selectedPiece = this.selectPiece(x, y);
    }
    this.gameCallback(this.io, this.room, this.getGameState());
  }

  copy(pieces){
    return JSON.parse(JSON.stringify(pieces));
  }

  removePiece(pieces, move){
    let i;
    if(move.takes){
      i = this.getPieceIndexFromPosition(pieces, move.takes.x, move.takes.y);
    } else {
      i = this.getPieceIndexFromPosition(pieces, move.x, move.y);
    }
    if(i !== -1){
      pieces.splice(i, 1);
    }
    return pieces;
  }

  validateMove(x, y){
    return this.selectedPiece.moves.some(move => (move.x === x && move.y === y));
  }

  movePiece(selectedPiece, pieces, move){
    this.removePiece(pieces, move);
    let i = this.getPieceIndexFromPosition(pieces, selectedPiece.x, selectedPiece.y);
    pieces[i].x = move.x;
    pieces[i].y = move.y;
    pieces[i].moved = true;
    if(move.rokad){
      let j = this.getPieceIndexFromPosition(pieces, move.rokad.from.x, move.rokad.from.y);
      pieces[j].x = move.rokad.to.x;
      pieces[j].y = move.rokad.to.y;
      pieces[j].moved = true;
    }
    if(move.pawnCrossing){
      
    }
    return pieces;
  }

  changePlayerTurn(){
    this.playerTurn++;
    this.playerTurn = this.playerTurn % this.playerCount;
  }

  getPieceFromPosition(x, y){
    return this.pieces.find(piece => (piece.x === x && piece.y === y));
  }

  getPieceIndexFromPosition(pieces, x, y){
    return pieces.findIndex(piece => (piece.x === x && piece.y === y));
  }

  selectPiece(x, y){
    if(this.getPieceFromPosition(x, y)){
      let piece = { ...this.getPieceFromPosition(x, y)};
      let moves = this.getPossibleMoves(this.pieces, piece, this.playerTurn);
      moves = moves.filter(move => {
        this.checkingPieces = [];
        if(move.rokad){
          let initialPieces = this.copy(this.pieces);
          let x = move.rokad.from.x === 7 ? 5 : 3;
          let pieces = this.movePiece(piece, initialPieces, {x, y: piece.y});
          this.checkingPieces = this.checkChecker(pieces, this.playerTurn).checkingPieces;
        }
        let initialPieces = this.copy(this.pieces);
        let pieces = this.movePiece(piece, initialPieces, move);
        this.checkingPieces.push(...this.checkChecker(pieces, this.playerTurn).checkingPieces);
        return this.checkingPieces.length === 0;
      });
      return { ...piece, moves};
    } else {
      return null;
    }
  }

  getPossibleMoves(pieces, piece, color){
    if((!piece) || piece.color !== color){
      return [];
    } else {
      switch(piece.type){
        case this.piecesIndex.bishopW:
          return this.getPossibleBishopMoves(pieces, piece);
        case this.piecesIndex.bishopB:
          return this.getPossibleBishopMoves(pieces, piece);
        case this.piecesIndex.kingW:
          return this.getPossibleKingMoves(pieces, piece);
        case this.piecesIndex.kingB:
          return this.getPossibleKingMoves(pieces, piece);
        case this.piecesIndex.knightW:
          return this.getPossibleKnightMoves(pieces, piece);
        case this.piecesIndex.knightB:
          return this.getPossibleKnightMoves(pieces, piece);
        case this.piecesIndex.pawnW:
          return this.getPossiblePawnMoves(pieces, piece);
        case this.piecesIndex.pawnB:
          return this.getPossiblePawnMoves(pieces, piece);
        case this.piecesIndex.queenW:
          return this.getPossibleQueenMoves(pieces, piece);
        case this.piecesIndex.queenB:
          return this.getPossibleQueenMoves(pieces, piece);
        case this.piecesIndex.rookW:
          return this.getPossibleRookMoves(pieces, piece);
        case this.piecesIndex.rookB:
          return this.getPossibleRookMoves(pieces, piece);
      }
    }
  }

  getPossibleBishopMoves(pieces, piece){
    let moves = [];
    let {x, y} = piece;
    let m1 = y - x, m2 = y + x;
    for(let i=x+1;i<8;i++){
      let j = m1 + i;
      let nextPiece = pieces.find(piece => (piece.x === i && piece.y === j));
      if(!nextPiece){
        moves.push({x: i, y: j});
      } else {
        if(nextPiece.color !== piece.color) {
          moves.push({x: i, y: j});
        }
        i = 8;
      }
    }
    for(let i=x+1;i<8;i++){
      let j = m2 - i;
      let nextPiece = pieces.find(piece => (piece.x === i && piece.y === j));
      if(!nextPiece){
        moves.push({x: i, y: j});
      } else {
        if(nextPiece.color !== piece.color) {
          moves.push({x: i, y: j});
        }
        i = 8;
      }
    }
    for(let i=x-1;i>=0;i--){
      let j = m1 + i;
      let nextPiece = pieces.find(piece => (piece.x === i && piece.y === j));
      if(!nextPiece){
        moves.push({x: i, y: j});
      } else {
        if(nextPiece.color !== piece.color) {
          moves.push({x: i, y: j});
        }
        i = -1;
      }
    }
    for(let i=x-1;i>=0;i--){
      let j = m2 - i;
      let nextPiece = pieces.find(piece => (piece.x === i && piece.y === j));
      if(!nextPiece){
        moves.push({x: i, y: j});
      } else {
        if(nextPiece.color !== piece.color) {
          moves.push({x: i, y: j});
        }
        i = -1;
      }
    }
    moves = moves.filter(move => (move.x >= 0 && move.x < 8));
    moves = moves.filter(move => (move.y >= 0 && move.y < 8));
    return moves;
  }
  getPossibleKingMoves(pieces, piece){
    let {x, y, color} = piece;
    let moves = [
      {
        x, 
        y: y + 1
      },
      {
        x: x + 1, 
        y: y + 1
      },
      {
        x: x + 1, 
        y
      },
      {
        x: x + 1, 
        y: y - 1
      },
      {
        x, 
        y: y - 1
      },
      {
        x: x - 1, 
        y: y - 1
      },
      {
        x: x - 1, 
        y
      },
      {
        x: x - 1, 
        y: y + 1
      },
    ];
    if(!piece.moved && !this.checkedKing){
      if(color === 1){
        if(this.getPieceFromPosition(7, 0) !== undefined && !this.getPieceFromPosition(7, 0).moved){
          if(!this.getPieceFromPosition(6, 0) && !this.getPieceFromPosition(5, 0)){
            moves.push({
              x: 6,
              y: 0,
              rokad: {
                from: {x: 7, y: 0},
                to: {x: 5, y: 0}
              }
            });
          }
        }
        if(this.getPieceFromPosition(0, 0) !== undefined && !this.getPieceFromPosition(0, 0).moved){
          if(!this.getPieceFromPosition(3, 0) && !this.getPieceFromPosition(2, 0) && !this.getPieceFromPosition(1, 0)){
            moves.push({
              x: 2,
              y: 0,
              rokad: {
                from: {x: 0, y: 0},
                to: {x: 3, y: 0}
              }
            });

          }
        }
      } else {
        if(this.getPieceFromPosition(7, 7) !== undefined && !this.getPieceFromPosition(7, 7).moved){
          if(!this.getPieceFromPosition(6, 7) && !this.getPieceFromPosition(5, 7)){
            moves.push({
              x: 6,
              y: 7,
              rokad: {
                from: {x: 7, y: 7},
                to: {x: 5, y: 7}
              }
            });
          }
        }
        if(this.getPieceFromPosition(0, 7) !== undefined && !this.getPieceFromPosition(0, 7).moved){
          if(!this.getPieceFromPosition(3, 7) && !this.getPieceFromPosition(2, 7) && !this.getPieceFromPosition(1, 7)){
            moves.push({
              x: 2,
              y: 7,
              rokad: {
                from: {x: 0, y: 7},
                to: {x: 3, y: 7}
              }
            });

          }
        }
      }
    }
    moves = moves.filter(move => (move.x >= 0 && move.x < 8));
    moves = moves.filter(move => (move.y >= 0 && move.y < 8));
    moves = moves.filter(move => {
      let pieceOnSpace = pieces.find(piece => (move.x === piece.x && move.y === piece.y));
      if(!pieceOnSpace){
        return true;
      } else if(pieceOnSpace.color !== color) {
        return true
      } else {
        return false;
      }
    });
    return moves;
  }

  getPossibleKnightMoves(pieces, piece){
    let {x, y} = piece;
    let moves = [
      {
        x: x - 1, 
        y: y + 2
      },
      {
        x: x + 1, 
        y: y + 2
      },
      {
        x: x + 2, 
        y: y + 1
      },
      {
        x: x + 2, 
        y: y - 1
      },
      {
        x: x + 1, 
        y: y - 2
      },
      {
        x: x - 1, 
        y: y - 2
      },
      {
        x: x - 2, 
        y: y - 1
      },
      {
        x: x - 2, 
        y: y + 1
      },
    ];
    moves = moves.filter(move => (move.x >= 0 && move.x < 8));
    moves = moves.filter(move => (move.y >= 0 && move.y < 8));
    moves = moves.filter(move => {
      let nextPiece = pieces.find(piece => (piece.x === move.x && piece.y === move.y));
      if(!nextPiece || nextPiece.color !== piece.color){
        return true;
      }
      return false;
    });
    return moves;
  }

  getPossiblePawnMoves(pieces, piece){
    let {x, y, color} = piece;
    let moves = [];
    if(color === 0){
      let leftForward = pieces.find(piece => (piece.x === x - 1 && piece.y === y - 1));
      let rightForward = pieces.find(piece => (piece.x === x + 1 && piece.y === y - 1));
      let forward = pieces.find(piece => (piece.x === x && piece.y === y - 1));
      let doubbleForward = pieces.find(piece => (piece.x === x && piece.y === y - 2));
      let left = pieces.find(piece => (piece.x === x - 1 && piece.y === y));
      let right = pieces.find(piece => (piece.x === x + 1 && piece.y === y));
      if(!forward){
        moves.push({x: x, y: y - 1});
        if(!doubbleForward && y === 6){
          moves.push({x: x, y: y - 2});
        }
      }
      if(rightForward){
        if(rightForward.color === 1){
          moves.push({x: x + 1, y: y - 1});
        }
      }
      if(leftForward){
        if(leftForward.color === 1){
          moves.push({x: x - 1, y: y - 1});
        }
      }
      if(y === 3){
        if(left){
          if(left.type === this.piecesIndex.pawnB){
            let lastMove = this.drawsMade[this.drawsMade.length - 1];
            if(lastMove.x === left.x && lastMove.y === left.y && lastMove.from.y === 1){
              moves.push({x: x - 1, y: y - 1, takes: {x: left.x, y: left.y}});
            }
          }
        }
        if(right){
          if(right.type === this.piecesIndex.pawnB){
            let lastMove = this.drawsMade[this.drawsMade.length - 1];
            if(lastMove.x === right.x && lastMove.y === right.y && lastMove.from.y === 1){
              moves.push({x: x + 1, y: y - 1, takes: {x: right.x, y: right.y}});
            }
          }
        }
      }
      moves = moves.map(move => {
        if(move.y === 0){
          move.pawnCrossing = true;
        }
        return move;
      });
    } else {
      let leftForward = pieces.find(piece => (piece.x === x - 1 && piece.y === y + 1));
      let rightForward = pieces.find(piece => (piece.x === x + 1 && piece.y === y + 1));
      let forward = pieces.find(piece => (piece.x === x && piece.y === y + 1));
      let doubbleForward = pieces.find(piece => (piece.x === x && piece.y === y + 2));
      let left = pieces.find(piece => (piece.x === x - 1 && piece.y === y));
      let right = pieces.find(piece => (piece.x === x + 1 && piece.y === y));
      if(!forward){
        moves.push({x: x, y: y + 1});
        if(!doubbleForward && y === 1){
          moves.push({x: x, y: y + 2});
        }
      }
      if(rightForward){
        if(rightForward.color === 0){
          moves.push({x: x + 1, y: y + 1});
        }
      }
      if(leftForward){
        if(leftForward.color === 0){
          moves.push({x: x - 1, y: y + 1});
        }
      }
      if(y === 4){
        if(left){
          if(left.type === this.piecesIndex.pawnW){
            let lastMove = this.drawsMade[this.drawsMade.length - 1];
            if(lastMove.x === left.x && lastMove.y === left.y && lastMove.from.y === 6){
              moves.push({x: x - 1, y: y + 1, takes: {x: left.x, y: left.y}});
            }
          }
        }
        if(right){
          if(right.type === this.piecesIndex.pawnW){
            let lastMove = this.drawsMade[this.drawsMade.length - 1];
            if(lastMove.x === right.x && lastMove.y === right.y && lastMove.from.y === 6){
              moves.push({x: x + 1, y: y + 1, takes: {x: right.x, y: right.y}});
            }
          }
        }
        moves = moves.map(move => {
          if(move.y === 7){
            move.pawnCrossing = true;
          }
          return move;
        });
      }
    }
    moves = moves.filter(move => (move.x >= 0 && move.x < 8));
    moves = moves.filter(move => (move.y >= 0 && move.y < 8));
    return moves;
  }

  getPossibleQueenMoves(pieces, piece){
    let rookMoves = this.getPossibleRookMoves(pieces, piece);
    let bishopMoves = this.getPossibleBishopMoves(pieces, piece);
    let moves = [...rookMoves, ...bishopMoves];
    return moves;
  }

  getPossibleRookMoves(pieces, piece){
    let {x, y} = piece;
    let moves = [];
    for(let i=x+1;i<8;i++){
      let nextPiece = pieces.find(piece => (piece.x === i && piece.y === y));
      if(!nextPiece){
        moves.push({x: i, y: y});
      } else {
        if(nextPiece.color !== piece.color){
          moves.push({x: i, y: y});
        }
        i = 8;
      }
    }
    for(let i=x-1;i>=0;i--){
      let nextPiece = pieces.find(piece => (piece.x === i && piece.y === y));
      if(!nextPiece){
        moves.push({x: i, y: y});
      } else {
        if(nextPiece.color !== piece.color){
          moves.push({x: i, y: y});
        }
        i = -1;
      }
    }
    for(let i=y+1;i<8;i++){
      let nextPiece = pieces.find(piece => (piece.x === x && piece.y === i));
      if(!nextPiece){
        moves.push({x: x, y: i});
      } else {
        if(nextPiece.color !== piece.color){
          moves.push({x: x, y: i});
        }
        i = 8;
      }
    }
    for(let i=y-1;i>=0;i--){
      let nextPiece = pieces.find(piece => (piece.x === x && piece.y === i));
      if(!nextPiece){
        moves.push({x: x, y: i});
      } else {
        if(nextPiece.color !== piece.color){
          moves.push({x: x, y: i});
        }
        i = -1;
      }
    }
    moves = moves.filter(move => (move.x >= 0 && move.x < 8));
    moves = moves.filter(move => (move.y >= 0 && move.y < 8));
    return moves;
  }

  checkChecker(pieces, color){
    let enemyPieces = pieces.filter(piece => (piece.color !== color));
    let king = pieces.find(piece => {
      return (piece.type === this.piecesIndex.kingB || piece.type === this.piecesIndex.kingW) && piece.color === color;
    });
    let checkingPieces = [], checkedKing = null;
    enemyPieces.forEach(piece => {
      let moves = this.getPossibleMoves(pieces, piece, (color + 1) % 2);
      let movesThatTakesTheKing = moves.filter(move => (move.x === king.x && move.y === king.y));
      if(movesThatTakesTheKing.length > 0){
        checkingPieces.push(piece);
      }
    });
    if(checkingPieces.length > 0){
      checkedKing = king;
    }
    return {checkingPieces, checkedKing};
  }

  mattChecker(){
    let color = this.checkedKing.color;
    let threatendPieces = this.pieces.filter(piece => (color === piece.color));
    return !threatendPieces.some(piece => {
      let pieces = this.copy(this.pieces);
      let moves = this.getPossibleMoves(pieces, piece, color);
      return moves.some(move => {
        let pieces2 = this.copy(this.pieces);
        pieces2 = this.movePiece(piece, pieces2, move);
        return this.checkChecker(pieces2, color).checkingPieces.length === 0;
      });
    });
  }

  checkPawnCrossing(pieces){
    return pieces.find(piece => {
      if((piece.color === 0 && piece.y === 0 && piece.type === this.piecesIndex.pawnW) || (piece.color === 1 && piece.y === 7  && piece.type === this.piecesIndex.pawnB)){
        return piece;
      }
    })
  }

  selectPieceFromCrossingPawn(xClick, yClick, xPosition, yPosition, playerTurn){
    if(playerTurn === 0){
      if(xClick === xPosition){
        if(yClick === yPosition){
          return {x: xPosition, y: yPosition, type: this.piecesIndex.queenW, color: 0};
        }
        else if(yClick === yPosition + 1){
          return {x: xPosition, y: yPosition, type: this.piecesIndex.rookW, color: 0};
        }
        else if(yClick === yPosition + 2){
          return {x: xPosition, y: yPosition, type: this.piecesIndex.knightW, color: 0};
        }
        else if(yClick === yPosition + 3){
          return {x: xPosition, y: yPosition, type: this.piecesIndex.bishopW, color: 0};
        }
      }
    } else {
      if(xClick === xPosition){
        if(yClick === yPosition){
          return {x: xPosition, y: yPosition, type: this.piecesIndex.queenB, color: 1};
        }
        else if(yClick === yPosition - 1){
          return {x: xPosition, y: yPosition, type: this.piecesIndex.rookB, color: 1};
        }
        else if(yClick === yPosition - 2){
          return {x: xPosition, y: yPosition, type: this.piecesIndex.knightB, color: 1};
        }
        else if(yClick === yPosition - 3){
          return {x: xPosition, y: yPosition, type: this.piecesIndex.bishopB, color: 1};
        }
      }
    }
    return null;
  }

  swapPiece(pieces, piece){
    pieces = pieces.map(pieceInPieces => {
      if(pieceInPieces.x === piece.x && pieceInPieces.y === piece.y){
        return piece;
      } else {
        return pieceInPieces;
      }
    });
    return pieces;
  }
}