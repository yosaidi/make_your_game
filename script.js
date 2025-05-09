// script.js
import { Bomb } from "./bomb.js";
import { Enemy } from "./enemy.js";
import { Character } from "./bomberman.js";

// Constants
export const CELL_SIZE = 44; // Changed to match CSS
const MAP_ROWS = 11;
const MAP_COLS = 13;
const DESTRUCTIBLE_COUNT = 30;
const ENEMY_COUNT = 5;
const INITIAL_LIVES = 3;
const INITIAL_TIME = 120;
const INITIAL_BOMB_COUNT = 1;
const INITIAL_BOMB_RANGE = 1;
const INITIAL_SPEED = 1;

export class Game {
  constructor() {
    this.playground = document.getElementById("game-area");
    this.maxBombs = INITIAL_BOMB_COUNT;
    this.bombRange = INITIAL_BOMB_RANGE;
    this.speed = INITIAL_SPEED;
    this.isGameOver = false;
    this.state = {
      lives: INITIAL_LIVES,
      score: 0,
      time: INITIAL_TIME,
      level: 1
    };
    this.door = { x: 0, y: 0 };
    this.character = null;
    this.enemies = [];
    this.enemyCount = ENEMY_COUNT;
    this.bombs = [];
    this.paused = false;
    this.muted = false;
    this.touchDevice = this.isTouchDevice();


    // Initialize audio
    this.bgMusic = new Audio('sound/game.mp3');
    this.bgMusic.loop = true;
    this.bgMusic.volume = 0.5;

    // Start with the loading screen
    this.showLoadingScreen();
  }

  // Initialize game assets and start
  async init() {
    // Show loading progress
    await this.preloadAssets();

    // Hide loading and show start screen
    document.getElementById("loading-screen").classList.add("hidden");
    document.getElementById("start-screen").classList.remove("hidden");

    // Setup event listeners for menu navigation
    this.setupMenuListeners();
  }

  // Simulate asset loading
  async preloadAssets() {
    const progress = document.querySelector(".loading-progress");
    for (let i = 0; i <= 100; i += 10) {
      progress.style.width = `${i}%`;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Setup menu navigation
  setupMenuListeners() {
    // Start button
    document.getElementById("start-btn").addEventListener("click", () => {
      document.getElementById("start-screen").classList.add("hidden");
      this.startGame();
    });

    // Instructions button
    document.getElementById("instructions-btn").addEventListener("click", () => {
      document.getElementById("start-screen").classList.add("hidden");
      document.getElementById("instructions-screen").classList.remove("hidden");
    });

    // Back button
    document.getElementById("back-to-start").addEventListener("click", () => {
      document.getElementById("instructions-screen").classList.add("hidden");
      document.getElementById("start-screen").classList.remove("hidden");
    });

    // Sound toggle
    document.getElementById("sound-toggle").addEventListener("click", () => {
      const muted = this.toggleSound();
      const icon = document.querySelector("#sound-toggle i");
      icon.className = muted ? "fas fa-volume-mute" : "fas fa-volume-high";
    });

    // Game over screen buttons
    document.getElementById("play-again-btn").addEventListener("click", () => {
      document.getElementById("game-over").classList.add("hidden");
      this.restartGame();
    });

    document.getElementById("main-menu-btn").addEventListener("click", () => {
      document.getElementById("game-over").classList.add("hidden");
      document.getElementById("start-screen").classList.remove("hidden");
    });

    // Level complete buttons
    document.getElementById("next-level-btn").addEventListener("click", () => {
      document.getElementById("level-complete").classList.add("hidden");
      this.nextLevel();
    });
  }

  // Start the actual game
  startGame() {
    // Show game elements
    document.getElementById("scoreboard").classList.remove("hidden");
    document.getElementById("game-area").classList.remove("hidden");
    document.getElementById("power-ups").classList.remove("hidden");

    if (this.touchDevice) {
      document.getElementById("mobile-controls").classList.remove("hidden");
    }

    // Initialize game state
    this.state = {
      lives: INITIAL_LIVES,
      score: 0,
      time: INITIAL_TIME,
      level: 1
    };

    this.isGameOver = false;
    this.constructPlayGround();
    this.placeDestructible();

    // Create character
    this.character = new Character(this);
    this.character.place();

    // Update displays
    this.updateDisplays();

    // Create enemies
    this.spawnEnemies();

    // Setup game event listeners
    this.setupGameEventListeners();

    // Start the game loop and timer
    this.paused = false;
    this.startTimer();
    this.gameLoop();

    // Start background music
    this.playBackgroundMusic();
  }

  // Load displays with initial values
  updateDisplays() {
    this.livesDisplay = document.getElementById("lives");
    this.livesDisplay.innerText = this.state.lives;

    document.getElementById("score").innerText = this.state.score;
    document.getElementById("level").innerText = this.state.level;

    // Update power-up display
    document.querySelector("#bomb-count span").innerText = this.maxBombs;
    document.querySelector("#bomb-range span").innerText = this.bombRange;
    document.querySelector("#speed span").innerText = this.speed;
  }

  // Create the game level
  constructPlayGround() {
    const map = document.createElement("div");
    map.className = "map";

    for (let i = 0; i < MAP_ROWS; i++) {
      const row = document.createElement("div");
      row.className = "game-row";

      for (let j = 0; j < MAP_COLS; j++) {
        const cell = document.createElement("img");

        const isWall =
          i === 0 || i === MAP_ROWS - 1 || j === 0 || j === MAP_COLS - 1 || (i % 2 === 0 && j % 2 === 0);

        cell.src = isWall ? "ressources/durable-wall.png" : "ressources/floor.png";
        if (!isWall) cell.classList.add("floor");

        cell.setAttribute("data-x", i);
        cell.setAttribute("data-y", j);
        row.appendChild(cell);
      }

      map.appendChild(row);
    }

    this.playground.innerHTML = ""; // clear previous map if any
    this.playground.appendChild(map);
  }

  // Place destructible walls and door
  placeDestructible() {
    let count = 0;
    const placed = new Set();

    while (count < DESTRUCTIBLE_COUNT) {
      const x = Math.floor(Math.random() * (MAP_ROWS - 2)) + 1;
      const y = Math.floor(Math.random() * (MAP_COLS - 2)) + 1;
      const key = `${x},${y}`;

      if (placed.has(key) || !this.isNotStartPosition(x, y)) continue;

      const cell = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
      if (cell && cell.src.includes("floor")) {
        cell.classList.remove("floor");
        cell.classList.add("breakable");
        cell.src = "ressources/destructible-wall.png";
        placed.add(key);

        // Place door under a random breakable wall
        if (count === Math.floor(Math.random() * DESTRUCTIBLE_COUNT)) {
          this.door.x = x;
          this.door.y = y;
          // Create hidden door element
          const doorElement = document.createElement("img");
          doorElement.src = "ressources/door.jpg";
          doorElement.className = "door hidden";
          doorElement.style.position = "absolute";
          doorElement.style.left = `${y * CELL_SIZE}px`;
          doorElement.style.top = `${x * CELL_SIZE}px`;
          doorElement.style.width = `${CELL_SIZE}px`;
          doorElement.style.height = `${CELL_SIZE}px`;
          doorElement.style.zIndex = "1";
          this.playground.appendChild(doorElement);
          this.doorElement = doorElement;
        }

        count++;
      }
    }
  }

  // Make sure destructible walls don't block player start
  isNotStartPosition(x, y) {
    return !((x === 1 && y === 1) || (x === 1 && y === 2) || (x === 2 && y === 1));
  }

  // Create enemies
  spawnEnemies() {
    this.enemies = [];
    for (let i = 0; i < ENEMY_COUNT; i++) {
      const enemy = new Enemy(this);
      this.enemies.push(enemy);
      this.playground.appendChild(enemy.element);
    }
  }

  // Start timer countdown
  startTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerElement = document.getElementById("timer");

    const updateDisplay = () => {
      const mins = Math.floor(this.state.time / 60);
      const secs = this.state.time % 60;
      this.timerElement.innerText = `${mins}:${String(secs).padStart(2, "0")}`;
    };

    updateDisplay();
    this.timerInterval = setInterval(() => {
      if (this.paused) return;

      if (this.state.time > 0) {
        this.state.time--;
        updateDisplay();
      } else {
        clearInterval(this.timerInterval);
        this.gameOver("Time's up!");
      }
    }, 1000);
  }

  // Game over handler
  gameOver(message = "Game Over!") {
    if (this.isGameOver) return;
    this.isGameOver = true;

    clearInterval(this.timerInterval);
    this.paused = true;

    // Final animation
    if (this.character) {
      this.character.playDeathAnimation();
    }

    setTimeout(() => {
      // Show game over screen
      const gameOverScreen = document.getElementById("game-over");
      const endMessage = document.getElementById("end-message");
      const finalScore = document.querySelector("#final-score span");

      endMessage.innerText = message;
      finalScore.innerText = this.state.score;
      gameOverScreen.classList.remove("hidden");

      // Clean up
      if (this.character) {
        this.character.destroy();
      }
      this.enemies.forEach(enemy => enemy.destroy());
      // this.bombs.forEach(bomb => bomb.destroy());
    }, 1000);
  }

  // Win level handler
  winLevel() {
    clearInterval(this.timerInterval);
    this.paused = true;
    this.isGameOver = true;

    // Calculate bonus
    const timeBonus = Math.floor(this.state.time * 10);
    this.state.score += timeBonus;

    // Show level complete screen
    const levelCompleteScreen = document.getElementById("level-complete");
    document.getElementById("level-time").innerText = this.timerElement.innerText;
    document.getElementById("level-score").innerText = this.state.score;

    setTimeout(() => {
      levelCompleteScreen.classList.remove("hidden");
    }, 1000);
  }

  // Move to next level
  nextLevel() {
    this.state.level++;
    this.state.time = INITIAL_TIME + (this.state.level * 30); // More time for higher levels

    // Increase difficulty
    if (this.state.level % 2 === 0) {
      // Every 2 levels, add an enemy
      this.enemyCount++;
    }

    // Clean up current level
    if (this.character) {
      this.character.destroy();
    }
    this.enemies.forEach(enemy => enemy.destroy());
    this.bombs.forEach(bomb => bomb.destroy());

    // Update displays
    document.getElementById("level").innerText = this.state.level;

    // Restart game with increased difficulty
    this.isGameOver = false;
    this.paused = false;
    this.constructPlayGround();
    this.placeDestructible();
    this.character = new Character(this);
    this.character.place();
    this.spawnEnemies();
    this.startTimer();
    this.gameLoop();
  }

  // Reveal door after all enemies are defeated
  revealDoor() {
    if (this.doorElement) {
      this.doorElement.classList.remove("hidden");
      this.doorElement.classList.add("door-found");
    }
  }

  // Fixed checkCollisions method
  checkCollisions() {
    // Check if character element exists and character is not dead
    if (!this.character.element || this.character.isDead) return;

    const charRect = this.character.element.getBoundingClientRect();
    const charCenter = {
      x: charRect.left + charRect.width / 2,
      y: charRect.top + charRect.height / 2,
    };

    // Check enemy collisions
    for (const enemy of this.enemies) {
      if (!enemy.element || enemy.isDead) continue;

      const enemyRect = enemy.element.getBoundingClientRect();
      const enemyCenter = {
        x: enemyRect.left + enemyRect.width / 2,
        y: enemyRect.top + enemyRect.height / 2,
      };

      const dx = charCenter.x - enemyCenter.x;
      const dy = charCenter.y - enemyCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < CELL_SIZE * 0.6 && !this.character.isInvincible) {
        // Set player as invincible immediately to prevent multiple collisions
        this.character.isInvincible = true;

        // Play death animation
        this.character.playDeathAnimation();

        // Reduce lives
        this.state.lives--;
        this.livesDisplay.innerText = this.state.lives;

        if (this.state.lives <= 0) {
          this.gameOver();
        } else {
          // Reset character position after a delay
          setTimeout(() => {
            // Make sure character still exists
            if (this.character && !this.isGameOver) {
              // Force character to reset position
              this.character.resetPosition();

              // Give player a grace period of invincibility
              setTimeout(() => {
                if (this.character) {
                  this.character.isInvincible = false;
                }
              }, 1500); // 1.5 seconds of invincibility after respawn
            }
          }, 1000); // Wait 1 second after death animation starts
        }

        return; // Exit the collision check after finding one collision
      }
    }

    // Check if all enemies are defeated and player found the door
    if (this.enemies.every(enemy => enemy.isDead) && !this.doorRevealed) {
      this.revealDoor();
      this.doorRevealed = true;
    }

    // Win condition - player reached the door
    if (this.doorRevealed &&
      Math.abs(this.character.x - this.door.x) < 0.5 &&
      Math.abs(this.character.y - this.door.y) < 0.5) {
      this.winLevel();
    }
  }

  // Main game loop
  gameLoop() {
    if (this.paused || this.isGameOver) return;

    this.checkCollisions();

    // Continue the loop
    this.animationFrame = requestAnimationFrame(() => this.gameLoop());
  }

  // Setup game controls
  setupGameEventListeners() {
    // Remove any existing event listeners
    document.removeEventListener("keydown", this.keyDownHandler);
    document.removeEventListener("keyup", this.keyUpHandler);

    // Keep track of keys pressed
    this.keysPressed = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      Space: false
    };

    // Keyboard handlers
    this.keyDownHandler = (e) => {
      if (this.paused || this.isGameOver) return;

      const key = e.key;

      // Movement keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
        e.preventDefault();
        this.keysPressed[key] = true;
        this.character.handleKeyDown(key);
      }

      // Bomb placement
      if (e.code === "Space" && !this.keysPressed.Space) {
        e.preventDefault();
        this.keysPressed.Space = true;

        // Check bomb count
        const bombCount = document.querySelectorAll(".bomb").length;
        if (bombCount < this.maxBombs && this.character) {
          const bomb = new Bomb(
            this.character.x,
            this.character.y,
            "player",
            this,
            this.character,
            this.enemies,
            this.bombRange
          );
          this.bombs.push(bomb);
        }
      }

      // Pause game
      if (key === "Escape") {
        if (this.paused) {          
          this.resumeGame();
        } else {
          this.pauseGame();
        }
      }
    };

    // Key up handler
    this.keyUpHandler = (e) => {
      if (this.isGameOver) return;

      const key = e.key;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(key)) {
        e.preventDefault();
        this.keysPressed[key] = false;
        this.character.handleKeyUp(key);
      }

      if (e.code === "Space") {
        this.keysPressed.Space = false;
      }
    };

    document.addEventListener("keydown", this.keyDownHandler);
    document.addEventListener("keyup", this.keyUpHandler);

    // Touch controls for mobile
    if (this.touchDevice) {
      this.setupTouchControls();
    }

    // Pause menu
    this.setupPauseMenu();
  }

  // Setup touch controls for mobile
  setupTouchControls() {
    const upBtn = document.getElementById("up-btn");
    const downBtn = document.getElementById("down-btn");
    const leftBtn = document.getElementById("left-btn");
    const rightBtn = document.getElementById("right-btn");
    const bombBtn = document.getElementById("bomb-btn");

    // Touch start handlers
    upBtn.addEventListener("touchstart", () => {
      this.character.handleKeyDown("ArrowUp");
    });

    downBtn.addEventListener("touchstart", () => {
      this.character.handleKeyDown("ArrowDown");
    });

    leftBtn.addEventListener("touchstart", () => {
      this.character.handleKeyDown("ArrowLeft");
    });

    rightBtn.addEventListener("touchstart", () => {
      this.character.handleKeyDown("ArrowRight");
    });

    bombBtn.addEventListener("touchstart", () => {
      const bombCount = document.querySelectorAll(".bomb").length;
      if (bombCount < this.maxBombs && this.character) {
        const bomb = new Bomb(
          this.character.x,
          this.character.y,
          "player",
          this,
          this.character,
          this.enemies,
          this.bombRange
        );
        this.bombs.push(bomb);
      }
    });

    // Touch end handlers
    upBtn.addEventListener("touchend", () => {
      this.character.handleKeyUp("ArrowUp");
    });

    downBtn.addEventListener("touchend", () => {
      this.character.handleKeyUp("ArrowDown");
    });

    leftBtn.addEventListener("touchend", () => {
      this.character.handleKeyUp("ArrowLeft");
    });

    rightBtn.addEventListener("touchend", () => {
      this.character.handleKeyUp("ArrowRight");
    });
  }

  // Setup pause menu
  setupPauseMenu() {
    const pauseMenu = document.getElementById("pause-menu");
    const resumeBtn = document.getElementById("resume-btn");
    const restartBtn = document.getElementById("restart-btn");
    const quitBtn = document.getElementById("quit-btn");

    resumeBtn.addEventListener("click", () => this.resumeGame());
    restartBtn.addEventListener("click", () => this.restartGame());
    quitBtn.addEventListener("click", () => {
      pauseMenu.classList.add("hidden");
      this.quitToMenu();
    });
  }

  // Pause the game
  pauseGame() {
    this.paused = true;
    cancelAnimationFrame(this.animationFrame);
    document.getElementById("pause-menu").classList.remove("hidden");
  }

  // Resume the game
  resumeGame() {
    this.paused = false;
    this.enemies.forEach(enemy => {
      enemy.resume();
    });
    document.getElementById("pause-menu").classList.add("hidden");
    this.gameLoop();
  }

  // Restart the current level
  restartGame() {
    // Reset state but keep score and level
    const currentLevel = this.state.level;
    const currentScore = this.state.score;

    this.state = {
      lives: INITIAL_LIVES,
      score: currentScore,
      time: INITIAL_TIME,
      level: currentLevel
    };

    // Reset game elements
    this.doorRevealed = false;
    this.isGameOver = false;
    this.paused = false;

    // Clean up
    if (this.character) {
      this.character.destroy();
    }
    this.enemies.forEach(enemy => enemy.destroy());
    this.bombs.forEach(bomb => bomb.destroy());

    // Reset the game
    this.constructPlayGround();
    this.placeDestructible();
    this.character = new Character(this);
    this.character.place();
    this.updateDisplays();
    this.spawnEnemies();
    this.startTimer();
    this.gameLoop();
    document.getElementById("pause-menu").classList.add("hidden");

  }

  // Quit to main menu
  quitToMenu() {
    this.isGameOver = true;
    this.paused = true;

    clearInterval(this.timerInterval);
    cancelAnimationFrame(this.animationFrame);

    // Clean up
    if (this.character) {
      this.character.destroy();
    }
    this.enemies.forEach(enemy => enemy.destroy());
    this.bombs.forEach(bomb => enemy.destroy());

    // Hide game elements
    document.getElementById("scoreboard").classList.add("hidden");
    document.getElementById("game-area").classList.add("hidden");
    document.getElementById("power-ups").classList.add("hidden");
    document.getElementById("mobile-controls").classList.add("hidden");

    // Show menu
    document.getElementById("start-screen").classList.remove("hidden");
  }


  // Play background music
  playBackgroundMusic() {
    if (!this.muted) {
      this.bgMusic.play().catch(error => {
        console.log("Audio playback prevented: ", error);
      });
    }
  }

  // Stop background music
  stopBackgroundMusic() {
    this.bgMusic.pause();
    this.bgMusic.currentTime = 0;
  }

  // Toggle sound (mute/unmute)
  toggleSound() {
    this.muted = !this.muted;

    if (this.muted) {
      this.bgMusic.pause();
    } else {
      this.playBackgroundMusic();
    }

    return this.muted;
  }


  // Add score points
  addScore(points) {
    this.state.score += points;
    document.getElementById("score").innerText = this.state.score;
  }

  // Show loading screen
  showLoadingScreen() {
    document.getElementById("loading-screen").classList.remove("hidden");
    this.init();
  }

  // Check if device has touch support
  isTouchDevice() {
    return (('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (navigator.msMaxTouchPoints > 0));
  }
}

// Initialize game
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});