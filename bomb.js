import { CELL_SIZE } from "./script.js";
import { Game } from "./script.js";

export class Bomb {
  constructor(x, y, id, game, character, enemies) {
    this.x = x;
    this.y = y;
    this.game = game
    this.character = character
    this.enemies = enemies
    const gridCell = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    const playground = document.getElementById("game-area");
    const bomb = document.createElement("div");
    bomb.setAttribute("data-x", x);
    bomb.setAttribute("data-y", y);
    const style = bomb.style;

    bomb.classList.add("bomb");
    bomb.id = id
    style.position = "absolute";
    style.left = `${gridCell.offsetLeft}px`;
    style.top = `${gridCell.offsetTop}px`;
    style.backgroundImage = "url('/ressources/bomb.png')";
    style.width = "38px";
    style.height = "39px";
    style.backgroundSize = "cover";
    style.backgroundPositionX = "1%";
    this.frameDelay = 200;
    playground.append(bomb);
    this.bomb = bomb;
    this.totalFrames = 3;
    this.frame = 1;
    this.frameSize = 38;
    this.lastCall = performance.now();
    this.animate();

    //trigger explosion
    setTimeout(() => this.explode(), 3000);
  }

  animate(time) {
    if (this.isExploded && this.frame === 0) {
      this.bomb.remove();
      return;
    }
    if (time - this.lastCall > this.frameDelay) {
      this.lastCall = time;
      const style = this.bomb.style;

      style.backgroundPositionX = this.frame * this.frameSize + "px";
      this.frame = (this.frame + 1) % this.totalFrames;
    }

    requestAnimationFrame((time) => this.animate(time));
  }
  explode() {
    const EXPLOSION_FRAME_SIZE = CELL_SIZE * 3;
    this.frame = 1;
    this.isExploded = true;
    this.totalFrames = 4;
    const style = this.bomb.style;
    style.backgroundImage = "url('/ressources/explosion.png')";
    style.backgroundSize = this.totalFrames * 100 + "%";
    style.backgroundPositionX = "0";
    style.width = EXPLOSION_FRAME_SIZE + "px";
    style.height = EXPLOSION_FRAME_SIZE + "px";
    style.left = parseInt(style.left) - CELL_SIZE + "px";
    style.top = parseInt(style.top) - CELL_SIZE + "px";
    this.frameSize = -EXPLOSION_FRAME_SIZE;
    this.lastCall = performance.now();
    this.breakSurroundingBlocks();
  }
  breakSurroundingBlocks() {
    const damagedAreas = [
      [this.x, this.y], // No need ig, Correction : there is a need
      [this.x, this.y + 1],
      [this.x, this.y - 1],
      [this.x + 1, this.y],
      [this.x - 1, this.y],
    ];

    damagedAreas.forEach((area) => {
      const x = area[0];
      const y = area[1];
      const enemies = document.querySelectorAll(".enemy")
      if (this.character.x === x && this.character.y === y) {
        this.game.gameOver();
      }   // Check enemy collisions
      this.enemies.forEach((enemy, index) => {
        if (enemy.x === x && enemy.y === y) {
          console.log("Enemy died at", x, y);
          enemy.playEnemyDeath();
          
          // Remove enemy from array after a delay (let animation play)
          setTimeout(() => {
            this.enemies.splice(index, 1);
          }, 800); // Match this with your death animation duration
        }
      });
      // console.log(this.enemies[1].x);
      
      const floor = document.createElement("img");
      if (this.game.door.x == x && this.game.door.y == y) {
        floor.src = "ressources/door.jpg";
        floor.classList.add("door")
      } else {
        floor.src = "ressources/floor.png";
        floor.classList.add("floor")
      }

      floor.setAttribute("data-x", x);
      floor.setAttribute("data-y", y);

      const brick = document.querySelector(
        `.breakable[data-x="${x}"][data-y="${y}"]`
      );
      brick?.replaceWith(floor);
    });
  }
}
