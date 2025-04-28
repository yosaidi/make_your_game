import { Bomb } from "./bomb.js";
import { Enemy } from "./enemy.js";

export const CELL_SIZE = 46;

export class Game {
  constructor() {
    this.playground = document.getElementById("game-area");
    this.maxBombs = 1;
    this.isGameOver = false; // Add this line
    this.character = new Character(this);
    this.door = {
      x: 0,
      y: 0,
    }
    this.state = {
      lives: 3,
      score: 0,
      time: 2,
    };

    this.init();
    this.gameLoop(); // Add this line
  }

  init() {
    this.constructPlayGround();
    this.placeDestructible();
    this.character.place();
    this.lives = document.getElementById("lives")
    
    lives.innerText = "3"
    // Create enemies and store their elements
    const enemy1 = new Enemy();
    const enemy2 = new Enemy();
    const enemy3 = new Enemy();
    const enemy4 = new Enemy();
    this.enemies = [enemy1, enemy2, enemy3, enemy4];

    // Append enemy elements to playground
    this.playground.append(enemy1.element, enemy2.element, enemy3.element, enemy4.element);

    this.setupEventListeners();
  }

  constructPlayGround() {
    const map = document.createElement("div");

    for (let i = 0; i < 11; i++) {
      let row = document.createElement("div");
      row.className = "game-row";

      for (let j = 0; j < 13; j++) {
        let ground = document.createElement("img");

        if (
          i === 0 ||
          i === 10 ||
          j === 0 ||
          j === 12 ||
          (j % 2 === 0 && i % 2 === 0)
        ) {
          ground.src = "ressources/durable-wall.png";
        } else {
          ground.src = "ressources/floor.png";
          ground.classList.add("floor");
        }

        ground.setAttribute("data-x", i);
        ground.setAttribute("data-y", j);
        row.appendChild(ground);
      }
      map.appendChild(row);
    }
    this.playground.appendChild(map);
  }

  placeDestructible() {
    let count = 0;
    while (count < 30) {
      const x = Math.floor(Math.random() * 9) + 1;
      const y = Math.floor(Math.random() * 11) + 1;
      if (count == 5) {
        this.door.x = x
        this.door.y = y
      }


      let grid = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);

      if (grid && grid.src.includes("floor") && this.isNotStartPosition(x, y)) {
        grid.classList.remove("floor");
        grid.classList.add("breakable");
        grid.src = "ressources/destructible-wall.png";
        count++;
      }
    }
  }

  isNotStartPosition(x, y) {
    return !(
      (x === 1 && y === 1) ||
      (x === 1 && y === 2) ||
      (x === 2 && y === 1)
    );
  }
  gameOver() {
    // Prevent multiple gameOver calls during animation
    if (this.isGameOver) return;
    this.isGameOver = true;
  
    if (this.state.lives > 1) {
      this.character.playDeathAnimation();
      this.state.lives--;
      this.lives.innerText = this.state.lives;
      
      setTimeout(() => {
        this.isGameOver = false;
        this.character = new Character(this);
        this.character.place();
      }, 1200); // Match this with death animation duration
    } else {
      this.lives.innerText = 0;
      this.character.playDeathAnimation();
      setTimeout(() => {
        this.character.destroy();
        // Add any game over screen logic here
      }, 1200);
    }
  }

  // Add this method to check readiness
  checkReadiness() {
    if (this.character.element && this.enemies.every(e => e.element)) {
      this.isReady = true;
    }
  }
  
  checkCollisions() {
    if (!this.isReady || !this.character.element) return;
    
    const charRect = this.character.element.getBoundingClientRect();
    const charCenterX = charRect.left + charRect.width / 2;
    const charCenterY = charRect.top + charRect.height / 2;

    for (const enemy of this.enemies) {
      if (!enemy.element) continue;
      
      const enemyRect = enemy.element.getBoundingClientRect();
      const enemyCenterX = enemyRect.left + enemyRect.width / 2;
      const enemyCenterY = enemyRect.top + enemyRect.height / 2;

      const dx = Math.abs(charCenterX - enemyCenterX);
      const dy = Math.abs(charCenterY - enemyCenterY);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < CELL_SIZE * 0.6) {
        this.gameOver();
        break;
      }
    }
  }
  gameLoop() {
    this.checkCollisions();
    requestAnimationFrame(() => this.gameLoop());
  }

  setupEventListeners() {
    document.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        this.character.handleKeyDown(e.key);
      }

      if (e.code === "Space") {
        const bombCount = document.querySelectorAll(".bomb#player").length;
        if (bombCount === this.maxBombs) {
          return;
        }
        new Bomb(this.character.x, this.character.y, "player", this, this.character, this.enemies);
      }
    });

    document.addEventListener("keyup", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        this.character.handleKeyUp(e.key);
      }
    });
  }
}

class Character {
  constructor(game) {
    this.game = game;
    this.element = null;
    this.x = 1;
    this.y = 1;
    this.isMoving = false;
    this.frameX = 0;
    this.moveSpeed = 100;
    this.animationFrame = null;
    this.lastFrameTime = performance.now();
    this.frameDelay = 100;
    this.lastMoveTime = 0;
    this.activeKey = null;
    this.currentDirection = null;
    this.translate = { x: 0, y: 0 };
    this.directionY = 0;

    // Sprite sheet configuration
    this.spriteConfig = {
      sheetWidth: 180,
      sheetHeight: 400,
      frameWidth: 45,    // 180 / 4 frames = 45px each
      frameHeight: 50,   // 400 / 8 rows = 50px each
      framesPerRow: 4,
      totalRows: 8,
      animations: {
        ArrowDown: { row: 0 },
        ArrowRight: { row: 2 },
        ArrowLeft: { row: 1 },
        ArrowUp: { row: 3 },
      }
    };
  }

  place() {
    let char = document.getElementById("character");
    if (char) char.remove();

    const gridCell = document.querySelector(`[data-x="1"][data-y="1"]`);
    if (!gridCell) return console.error("Character spawn point not found!");

    const character = document.createElement("div");
    character.className = "character";
    character.id = "character";
    character.style.zIndex = "2";
    character.style.width = `${this.spriteConfig.frameWidth}px`;
    character.style.height = `${this.spriteConfig.frameHeight}px`;
    character.style.backgroundImage = 'url("ressources/hitler.png")';
    character.style.backgroundSize = `${this.spriteConfig.sheetWidth}px ${this.spriteConfig.sheetHeight}px`;
    character.style.backgroundPosition = "0px 0px";
    character.style.position = "absolute";

    // Improved placement with proper centering
    const placeCharacter = () => {
      const offsetX = gridCell.offsetLeft + (CELL_SIZE - this.spriteConfig.frameWidth) / 2;
      const offsetY = gridCell.offsetTop + (CELL_SIZE - this.spriteConfig.frameHeight) / 2;

      character.style.left = `${offsetX}px`;
      character.style.top = `${offsetY}px`;

      this.element = character;
      this.game.playground.appendChild(character);
      this.game.checkReadiness(); // Notify game that we're loaded

      // Initialize position
      this.x = 1;
      this.y = 1;

      // Start animation loop
      requestAnimationFrame((timestamp) => this.animateSprite(timestamp));
    };

    // Check if image is already loaded
    if (gridCell.complete && gridCell.offsetLeft > 0 && gridCell.offsetTop > 0) {
      placeCharacter();
    } else {
      const onLoad = () => {
        gridCell.removeEventListener('load', onLoad);
        placeCharacter();
      };
      gridCell.addEventListener('load', onLoad);

      // Fallback in case load event doesn't fire
      setTimeout(() => {
        if (gridCell.offsetLeft > 0 && gridCell.offsetTop > 0) {
          placeCharacter();
        }
      }, 100);
    }
  }

  handleKeyDown(key) {
    this.activeKey = key;
    if (!this.isMoving) {
      this.move(key);
    }
  }

  handleKeyUp(key) {
    if (key === this.activeKey) {
      this.activeKey = null;
    }
  }

  move(direction) {
    const now = performance.now();
    if (now - this.lastMoveTime < 17) return;

    let newX = this.x;
    let newY = this.y;

    switch (direction) {
      case "ArrowDown": newX++; break;
      case "ArrowUp": newX--; break;
      case "ArrowLeft": newY--; break;
      case "ArrowRight": newY++; break;
      default: return;
    }

    const newGridCell = document.querySelector(`[data-x="${newX}"][data-y="${newY}"]`);
    if (
      !newGridCell ||
      newGridCell.src.includes("durable-wall") ||
      newGridCell.src.includes("destructible-wall")
    ) return;

    this.isMoving = true;
    this.currentDirection = direction;
    this.lastMoveTime = now;

    // Set animation direction
    const anim = this.spriteConfig.animations[direction];
    this.directionY = -anim.row * this.spriteConfig.frameHeight;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    const oldX = this.x;
    const oldY = this.y;
    this.x = newX;
    this.y = newY;

    this.step(newX - oldX, newY - oldY, direction).then(() => {
      this.isMoving = false;
      if (this.activeKey) {
        this.move(this.activeKey);
      }
    });
  }

  step(dx, dy, direction) {
    const duration = 600;
    const startTime = performance.now();
    const distanceX = dx * CELL_SIZE;
    const distanceY = dy * CELL_SIZE;

    // Get current position
    const startLeft = parseFloat(this.element.style.left);
    const startTop = parseFloat(this.element.style.top);

    return new Promise((resolve) => {
      const animate = (timestamp) => {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Calculate new position
        const newLeft = startLeft + (dy * CELL_SIZE * progress);
        const newTop = startTop + (dx * CELL_SIZE * progress);

        this.element.style.left = `${newLeft}px`;
        this.element.style.top = `${newTop}px`;

        // Update sprite animation
        this.element.style.backgroundPositionY = `${this.directionY}px`;

        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      this.animationFrame = requestAnimationFrame(animate);
    });
  }

  animateSprite(timestamp) {
    if (!this.lastFrameTime) this.lastFrameTime = timestamp;
    const elapsed = timestamp - this.lastFrameTime;

    // Only animate if character is moving
    if (this.isMoving && elapsed >= this.frameDelay) {
      this.frameX = (this.frameX + 1) % this.spriteConfig.framesPerRow;
      this.element.style.backgroundPositionX = `-${this.frameX * this.spriteConfig.frameWidth}px`;
      this.lastFrameTime = timestamp;
    }
    // Reset to first frame when not moving
    else if (!this.isMoving) {
      this.frameX = 0;
      this.element.style.backgroundPositionX = `0px`;
    }

    requestAnimationFrame((timestamp) => this.animateSprite(timestamp));
  }
  playDeathAnimation() {
    // Stop all other animations and movement
    this.isMoving = false;
    this.activeKey = null;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    // Death animation configuration
    const deathRow = 6; // 7th row (0-indexed)
    const frameCount = this.spriteConfig.framesPerRow;
    const frameWidth = this.spriteConfig.frameWidth;
    const frameHeight = this.spriteConfig.frameHeight;
    const animationDuration = 1200; // Total animation duration in ms
    const frameDelay = animationDuration / frameCount;

    // Store original styles to restore if needed
    this.originalStyles = {
      backgroundPositionX: this.element.style.backgroundPositionX,
      backgroundPositionY: this.element.style.backgroundPositionY
    };

    // Set initial death animation frame
    this.element.style.backgroundPositionY = `-${deathRow * frameHeight}px`;
    this.element.style.backgroundPositionX = "0px";

    let currentFrame = 0;
    const startTime = performance.now();

    const animateDeath = (timestamp) => {
      if (!this.deathStartTime) this.deathStartTime = timestamp;
      const elapsed = timestamp - this.deathStartTime;
      const frame = Math.min(
        Math.floor(elapsed / frameDelay),
        frameCount - 1
      );

      if (frame !== currentFrame) {
        currentFrame = frame;
        this.element.style.backgroundPositionX = `-${currentFrame * frameWidth}px`;
      }

      if (currentFrame < frameCount - 1) {
        this.deathAnimationFrame = requestAnimationFrame(animateDeath);
      } else {
        // Animation complete - fade out or remove character
        this.element.style.transition = "opacity 0.5s ease-out";
        this.element.style.opacity = "0";

        // Optional: Remove element after fade out
        setTimeout(() => {
          if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
          }
        }, 500);
      }
    };

    this.deathStartTime = null;
    this.deathAnimationFrame = requestAnimationFrame(animateDeath);
  }

  // Add cleanup method
  destroy() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    if (this.deathAnimationFrame) cancelAnimationFrame(this.deathAnimationFrame);
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}



// Initialize the game
new Game();