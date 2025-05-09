// bomb.js
import { CELL_SIZE } from "./script.js";

export class Bomb {
  constructor(x, y, id, game, character, enemies, bombRange = 1) {
    this.x = x;
    this.y = y;
    this.game = game;
    this.character = character;
    this.enemies = enemies;
    this.bombRange = bombRange;
    this.explosionCells = [];

    const gridCell = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    if (!gridCell) return console.error("Invalid bomb placement position");

    const playground = document.getElementById("game-area");
    const bomb = document.createElement("div");
    bomb.setAttribute("data-x", x);
    bomb.setAttribute("data-y", y);

    bomb.classList.add("bomb");
    bomb.id = id;

    const style = bomb.style;
    style.position = "absolute";
    style.left = `${gridCell.offsetLeft}px`;
    style.top = `${gridCell.offsetTop}px`;
    style.backgroundImage = "url('ressources/bomb.png')";
    style.width = "38px";
    style.height = "39px";
    style.backgroundSize = "cover";
    style.backgroundPositionX = "0px";
    style.zIndex = "2";

    this.frameDelay = 200;
    playground.appendChild(bomb);
    this.bomb = bomb;
    this.totalFrames = 3;
    this.frame = 0;
    this.frameSize = 38;
    this.lastCall = performance.now();
    this.isExploded = false;

    // Start animation
    this.animationFrame = requestAnimationFrame((time) => this.animate(time));

    // Play sound
    if (!this.game.muted) {
      // TODO: Add bomb placement sound
    }

    // Trigger explosion after delay
    this.explosionTimer = setTimeout(() => this.explode(), 3000);
  }

  animate(time) {

    if (this.game.paused) {
      // Pause animation, but keep the frame for when it resumes
      this.animationFrame = requestAnimationFrame((time) => this.animate(time));
      return;
    }
    if (this.isExploded && this.frame >= this.totalFrames - 1) {
      this.destroy();
      return;
    }

    if (time - this.lastCall > this.frameDelay) {
      this.lastCall = time;
      const style = this.bomb.style;

      if (this.isExploded) {
        // Explosion animation
        style.backgroundPositionX = `-${this.frame * this.frameSize}px`;
      } else {
        // Bomb ticking animation
        style.backgroundPositionX = `-${this.frame * this.frameSize}px`;
      }

      this.frame = (this.frame + 1) % this.totalFrames;
    }

    this.animationFrame = requestAnimationFrame((time) => this.animate(time));
  }

  explode() {
    if (this.game.paused) {
      // Pause animation, but keep the frame for when it resumes
      this.animationFrame = requestAnimationFrame(() => this.explode());
      return;
    }
    if (this.isExploded) return; // Prevent multiple explosions

    this.isExploded = true;
    clearTimeout(this.explosionTimer);

    const EXPLOSION_FRAME_SIZE = CELL_SIZE;
    this.frame = 0;
    this.totalFrames = 4;

    const style = this.bomb.style;
    style.backgroundImage = "url('ressources/explosion.png')";
    style.backgroundSize = `${this.totalFrames * 100}%`;
    style.width = `${EXPLOSION_FRAME_SIZE}px`;
    style.height = `${EXPLOSION_FRAME_SIZE}px`;

    // Create explosion effects in all directions
    this.createExplosionEffects();

    // Check for damage to players, enemies, and blocks
    this.checkExplosionDamage();

    // Play explosion sound
    if (!this.game.muted) {
      const explosionSound = new Audio('sound/bomb.mp3');
      explosionSound.volume = 0.5;
      explosionSound.play().catch(error => {
        console.log("Audio playback prevented: ", error);
      });
    }

    // Remove bomb after explosion animation completes
    setTimeout(() => {
      this.destroy();
    }, this.frameDelay * this.totalFrames);
  }

  createExplosionEffects() {
    // Center explosion
    this.addExplosionEffect(this.x, this.y, "center");

    // Create explosions in four directions based on bomb range
    const directions = [
      { dx: 0, dy: 1, name: "right" },
      { dx: 0, dy: -1, name: "left" },
      { dx: 1, dy: 0, name: "down" },
      { dx: -1, dy: 0, name: "up" }
    ];

    directions.forEach(dir => {
      for (let i = 1; i <= this.bombRange; i++) {
        const newX = this.x + dir.dx * i;
        const newY = this.y + dir.dy * i;

        // Check if we hit a wall
        const cell = document.querySelector(`[data-x="${newX}"][data-y="${newY}"]`);
        if (!cell) break;

        if (cell.src && cell.src.includes("durable-wall")) {
          break; // Stop explosion in this direction
        }

        const isEnd = i === this.bombRange;
        const type = isEnd ? `${dir.name}-end` : dir.name;
        this.addExplosionEffect(newX, newY, type);

        if (cell.src && cell.src.includes("destructible-wall")) {
          break; // Stop after hitting destructible wall
        }
      }
    });
  }

  addExplosionEffect(x, y, type) {
    const gridCell = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    if (!gridCell) return;

    const explosion = document.createElement("div");
    explosion.className = `explosion explosion-${type}`;
    explosion.style.position = "absolute";
    explosion.style.left = `${gridCell.offsetLeft}px`;
    explosion.style.top = `${gridCell.offsetTop}px`;
    explosion.style.width = `${CELL_SIZE}px`;
    explosion.style.height = `${CELL_SIZE}px`;
    explosion.style.backgroundImage = "url('ressources/explosion.png')";
    explosion.style.backgroundSize = "cover";
    explosion.style.zIndex = "3";

    this.game.playground.appendChild(explosion);
    this.explosionCells.push(explosion);

    // Remove explosion effect after animation
    setTimeout(() => {
      if (explosion.parentNode) {
        explosion.parentNode.removeChild(explosion);
      }
    }, 500);
  }

  checkExplosionDamage() {
    const damagedAreas = [];

    // Add center
    damagedAreas.push([this.x, this.y]);

    // Add cells in all four directions - FIXED to properly respect walls
    const directions = [
      { dx: 0, dy: 1 }, // Right
      { dx: 0, dy: -1 }, // Left
      { dx: 1, dy: 0 },  // Down
      { dx: -1, dy: 0 }  // Up
    ];

    directions.forEach(dir => {
      let shouldContinue = true;
      for (let i = 1; i <= this.bombRange && shouldContinue; i++) {
        const newX = this.x + dir.dx * i;
        const newY = this.y + dir.dy * i;

        // Check if position is valid
        const cell = document.querySelector(`[data-x="${newX}"][data-y="${newY}"]`);
        if (!cell) {
          shouldContinue = false;
          continue;
        }

        // Add to damaged areas
        damagedAreas.push([newX, newY]);

        // Stop if we hit a durable wall
        if (cell.src && cell.src.includes("durable-wall")) {
          shouldContinue = false;
          continue;
        }

        // Stop after this cell if we hit a destructible wall
        if (cell.src && cell.src.includes("destructible-wall")) {
          shouldContinue = false;
        }
      }
    });

    // Process each damaged area
    damagedAreas.forEach(area => {
      const x = area[0];
      const y = area[1];

      // Check if character is hit
      if (this.character && this.character.x === x && this.character.y === y) {
        this.character.playDeathAnimation();
        this.game.state.lives--;
        this.game.livesDisplay.innerText = this.game.state.lives;

        if (this.game.state.lives <= 0) {
          this.game.gameOver();
        } else {
          // Reset character position but keep going
          setTimeout(() => {
            this.character.resetPosition();
          }, 1000);
        }
      }

      // Check if enemies are hit
      this.enemies.forEach((enemy, index) => {
        if (!enemy.isDead && enemy.x === x && enemy.y === y) {
          enemy.isDead = true;
          enemy.playEnemyDeath();

          // Add score
          this.game.addScore(100);

          // Check if all enemies are defeated
          if (this.enemies.every(e => e.isDead)) {
            this.game.revealDoor();
          }
        }
      });

      // Check for destructible walls
      const brick = document.querySelector(`.breakable[data-x="${x}"][data-y="${y}"]`);
      if (brick) {
        // Create floor tile
        const floor = document.createElement("img");

        // Check if this is where the door is hidden
        if (this.game.door.x === x && this.game.door.y === y) {
          floor.src = "ressources/door.jpg";
          floor.classList.add("door");

          // If all enemies are dead, show the door
          if (this.enemies.every(e => e.isDead)) {
            this.game.revealDoor();
          }
        } else {
          floor.src = "ressources/floor.png";
          floor.classList.add("floor");
        }

        floor.setAttribute("data-x", x);
        floor.setAttribute("data-y", y);

        // Replace brick with floor
        brick.replaceWith(floor);

        // Add score for destroying a wall
        this.game.addScore(10);
      }
    });
  }


  destroy() {
    // Clear animation frame
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    // Clear timers
    if (this.explosionTimer) {
      clearTimeout(this.explosionTimer);
    }

    // Remove explosion effects
    this.explosionCells.forEach(cell => {
      if (cell.parentNode) {
        cell.parentNode.removeChild(cell);
      }
    });

    // Remove bomb element
    if (this.bomb && this.bomb.parentNode) {
      this.bomb.parentNode.removeChild(this.bomb);
    }

    // Remove from game's bombs array
    const index = this.game.bombs.indexOf(this);
    if (index !== -1) {
      this.game.bombs.splice(index, 1);
    }
  }
}