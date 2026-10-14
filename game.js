(() => {
  "use strict";

  const SIZE = 4;
  const BEST_KEY = "little-2048-best";
  const boardElement = document.getElementById("board");
  const backgroundElement = document.getElementById("board-background");
  const tileLayer = document.getElementById("tile-layer");
  const scoreElement = document.getElementById("score");
  const bestElement = document.getElementById("best-score");
  const statusElement = document.getElementById("game-status");
  const overlay = document.getElementById("game-overlay");
  const dialogTitle = document.getElementById("dialog-title");
  const dialogMessage = document.getElementById("dialog-message");
  const continueButton = document.getElementById("continue-game");
  const playAgainButton = document.getElementById("play-again");

  let board = [];
  let score = 0;
  let best = readBestScore();
  let hasWon = false;
  let pointerStart = null;

  function readBestScore() {
    try {
      return Number(window.localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  function buildBoardBackground() {
    const cells = document.createDocumentFragment();
    for (let i = 0; i < SIZE * SIZE; i += 1) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cells.appendChild(cell);
    }
    backgroundElement.replaceChildren(cells);
  }

  function updateScores(points = 0) {
    scoreElement.textContent = String(score);
    bestElement.textContent = String(best);
    if (points > 0) {
      statusElement.textContent = `合并得分 ${points} 分，当前分数 ${score} 分。`;
    }
  }

  function render(spawnedPosition = null, mergedPositions = new Set()) {
    const tiles = document.createDocumentFragment();
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const value = board[y][x];
        if (value === 0) continue;

        const tile = document.createElement("div");
        tile.className = `tile tile-${value}`;
        if (value > 2048) tile.classList.add("tile--super");
        if (spawnedPosition && spawnedPosition.x === x && spawnedPosition.y === y) {
          tile.classList.add("tile--spawn");
        }
        if (mergedPositions.has(`${x},${y}`)) tile.classList.add("tile--merged");
        tile.style.gridColumn = String(x + 1);
        tile.style.gridRow = String(y + 1);
        tile.setAttribute("role", "gridcell");
        tile.setAttribute("aria-label", String(value));
        tile.textContent = String(value);
        tiles.appendChild(tile);
      }
    }
    tileLayer.replaceChildren(tiles);
  }

  function spawnTile() {
    const emptyCells = [];
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        if (board[y][x] === 0) emptyCells.push({ x, y });
      }
    }
    if (emptyCells.length === 0) return null;
    const position = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    board[position.y][position.x] = Math.random() < 0.9 ? 2 : 4;
    return position;
  }

  function newGame() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    score = 0;
    hasWon = false;
    hideOverlay();
    spawnTile();
    spawnTile();
    updateScores();
    render();
    statusElement.textContent = "新游戏开始。";
    boardElement.focus({ preventScroll: true });
  }

  function lineCoordinates(direction, lineIndex) {
    const coordinates = [];
    for (let step = 0; step < SIZE; step += 1) {
      if (direction === "left") coordinates.push([step, lineIndex]);
      if (direction === "right") coordinates.push([SIZE - 1 - step, lineIndex]);
      if (direction === "up") coordinates.push([lineIndex, step]);
      if (direction === "down") coordinates.push([lineIndex, SIZE - 1 - step]);
    }
    return coordinates;
  }

  function move(direction) {
    if (!overlay.hidden) return;

    const nextBoard = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    const mergedPositions = new Set();
    let gained = 0;

    for (let lineIndex = 0; lineIndex < SIZE; lineIndex += 1) {
      const coordinates = lineCoordinates(direction, lineIndex);
      const values = coordinates.map(([x, y]) => board[y][x]).filter((value) => value !== 0);
      const output = [];

      for (let index = 0; index < values.length; index += 1) {
        if (values[index] === values[index + 1]) {
          const mergedValue = values[index] * 2;
          output.push(mergedValue);
          gained += mergedValue;
          const [x, y] = coordinates[output.length - 1];
          mergedPositions.add(`${x},${y}`);
          index += 1;
        } else {
          output.push(values[index]);
        }
      }

      coordinates.forEach(([x, y], index) => {
        nextBoard[y][x] = output[index] || 0;
      });
    }

    const changed = board.some((row, y) => row.some((value, x) => value !== nextBoard[y][x]));
    if (!changed) return;

    board = nextBoard;
    score += gained;
    if (score > best) {
      best = score;
      try {
        window.localStorage.setItem(BEST_KEY, String(best));
      } catch {
        // The game still works when browser storage is unavailable.
      }
    }

    const spawnedPosition = spawnTile();
    updateScores(gained);
    render(spawnedPosition, mergedPositions);

    if (!hasWon && board.some((row) => row.includes(2048))) {
      showOverlay("win");
    } else if (isGameOver()) {
      showOverlay("over");
    }
  }

  function isGameOver() {
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        if (board[y][x] === 0) return false;
        if (x < SIZE - 1 && board[y][x] === board[y][x + 1]) return false;
        if (y < SIZE - 1 && board[y][x] === board[y + 1][x]) return false;
      }
    }
    return true;
  }

  function showOverlay(state) {
    overlay.dataset.state = state;
    overlay.hidden = false;
    if (state === "win") {
      dialogTitle.textContent = "太厉害了！";
      dialogMessage.textContent = "你合成了 2048！继续挑战更大的数字，或者开启一局新的游戏。";
      continueButton.hidden = false;
      playAgainButton.hidden = true;
      statusElement.textContent = "恭喜，合成了 2048！";
    } else {
      dialogTitle.textContent = "再试一次？";
      dialogMessage.textContent = `棋盘上已经没有可移动的方块。本局得分：${score}。`;
      continueButton.hidden = true;
      playAgainButton.hidden = false;
      statusElement.textContent = "游戏结束。";
    }
  }

  function hideOverlay() {
    overlay.hidden = true;
    delete overlay.dataset.state;
  }

  document.getElementById("new-game").addEventListener("click", newGame);
  playAgainButton.addEventListener("click", newGame);
  continueButton.addEventListener("click", () => {
    hasWon = true;
    hideOverlay();
    boardElement.focus({ preventScroll: true });
    statusElement.textContent = "继续游戏。";
  });

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const directions = {
      arrowleft: "left", a: "left",
      arrowright: "right", d: "right",
      arrowup: "up", w: "up",
      arrowdown: "down", s: "down"
    };
    const direction = directions[key];
    if (!direction) return;
    event.preventDefault();
    move(direction);
  });

  boardElement.addEventListener("pointerdown", (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
    if (boardElement.setPointerCapture) boardElement.setPointerCapture(event.pointerId);
  });

  boardElement.addEventListener("pointerup", (event) => {
    if (!pointerStart) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) return;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      move(deltaX > 0 ? "right" : "left");
    } else {
      move(deltaY > 0 ? "down" : "up");
    }
  });

  boardElement.addEventListener("pointercancel", () => { pointerStart = null; });

  buildBoardBackground();
  bestElement.textContent = String(best);
  newGame();
})();
