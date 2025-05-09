// bomberman.js
import { CELL_SIZE } from "./script.js";

export class Character {
    constructor(game) {
        this.game = game;
        this.element = null;
        this.x = 1;
        this.y = 1;
        this.isMoving = false;
        this.activeKey = null;
        this.currentDirection = null;
        this.animationFrame = null;
        this.deathAnimationFrame = null;
        this.lastFrameTime = performance.now();
        this.frameX = 0;
        this.frameDelay = 100;
        this.lastMoveTime = 0;
        this.directionY = 0;
        this.isInvincible = false;
        this.isDead = false;
        this.spriteConfig = {
            sheetWidth: 180,
            sheetHeight: 400,
            frameWidth: 45,
            frameHeight: 50,
            framesPerRow: 4,
            totalRows: 8,
            animations: {
                ArrowDown: { row: 0 },
                ArrowLeft: { row: 1 },
                ArrowRight: { row: 2 },
                ArrowUp: { row: 3 }
            }
        };
    }

    place() {
        const oldChar = document.getElementById("character");
        if (oldChar) oldChar.remove();

        const gridCell = document.querySelector(`[data-x="1"][data-y="1"]`);
        if (!gridCell) return console.error("Character spawn point not found!");

        const character = document.createElement("div");
        character.id = "character";
        character.className = "character";
        character.style.cssText = `
            position: absolute;
            z-index: 10;
            width: ${this.spriteConfig.frameWidth}px;
            height: ${this.spriteConfig.frameHeight}px;
            background-image: url("ressources/hitler.png");
            background-size: ${this.spriteConfig.sheetWidth}px ${this.spriteConfig.sheetHeight}px;
            background-position: 0px 0px;
        `;

        const placeCharacter = () => {
            const offsetX = gridCell.offsetLeft + (CELL_SIZE - this.spriteConfig.frameWidth) / 2;
            const offsetY = gridCell.offsetTop + (CELL_SIZE - this.spriteConfig.frameHeight) / 2;

            character.style.left = `${offsetX}px`;
            character.style.top = `${offsetY}px`;

            this.element = character;
            this.game.playground.appendChild(character);
            // this.game.checkReadiness();

            this.x = 1;
            this.y = 1;

            requestAnimationFrame((ts) => this.animateSprite(ts));
        };

        if (gridCell.offsetLeft > 0 && gridCell.offsetTop > 0) {
            placeCharacter();
        } else {
            setTimeout(placeCharacter, 100);
        }
    }

    handleKeyDown(key) {
        if (this.isDead) return;
        this.activeKey = key;
        if (!this.isMoving) {
            this.move(key);
        }
    }

    handleKeyUp(key) {
        if (key === this.activeKey) this.activeKey = null;
    }

    move(direction) {
        if (this.isDead) return;

        const now = performance.now();
        if (now - this.lastMoveTime < 17) return;

        let [dx, dy] = [0, 0];
        if (direction === "ArrowDown") dx = 1;
        else if (direction === "ArrowUp") dx = -1;
        else if (direction === "ArrowLeft") dy = -1;
        else if (direction === "ArrowRight") dy = 1;
        else return;

        const newX = this.x + dx;
        const newY = this.y + dy;
        const newCell = document.querySelector(`[data-x="${newX}"][data-y="${newY}"]`);

        if (
            !newCell ||
            newCell.src?.includes("durable-wall") ||
            newCell.src?.includes("destructible-wall")
        ) return;

        this.isMoving = true;
        this.currentDirection = direction;
        this.lastMoveTime = now;

        const anim = this.spriteConfig.animations[direction];
        this.directionY = -anim.row * this.spriteConfig.frameHeight;

        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);

        this.step(dx, dy).then(() => {
            this.x = newX;
            this.y = newY;
            this.isMoving = false;

            if (this.activeKey) {
                this.move(this.activeKey);
            }
        });
    }

    step(dx, dy) {
        const duration = 400;
        const startTime = performance.now();
        const startLeft = parseFloat(this.element.style.left);
        const startTop = parseFloat(this.element.style.top);
        const distanceX = dy * CELL_SIZE;
        const distanceY = dx * CELL_SIZE;

        return new Promise((resolve) => {
            const animate = (timestamp) => {
                const elapsed = timestamp - startTime;
                const progress = Math.min(elapsed / duration, 1);

                this.element.style.left = `${startLeft + distanceX * progress}px`;
                this.element.style.top = `${startTop + distanceY * progress}px`;
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
        const elapsed = timestamp - this.lastFrameTime;

        if (this.isMoving && elapsed >= this.frameDelay) {
            this.frameX = (this.frameX + 1) % this.spriteConfig.framesPerRow;
            this.element.style.backgroundPositionX = `-${this.frameX * this.spriteConfig.frameWidth}px`;
            this.lastFrameTime = timestamp;
        } else if (!this.isMoving) {
            this.frameX = 0;
            this.element.style.backgroundPositionX = "0px";
        }

      requestAnimationFrame((ts) => this.animateSprite(ts));
    }

    playDeathAnimation() {
        this.isMoving = false;
        this.activeKey = null;
        this.isDead = true;

        // Cancel any ongoing animations
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        if (this.deathAnimationFrame) {
            cancelAnimationFrame(this.deathAnimationFrame);
            this.deathAnimationFrame = null;
        }

        const deathRow = 6;
        const frameCount = this.spriteConfig.framesPerRow;
        const frameDelay = 1200 / frameCount;
        let currentFrame = 0;

        this.element.style.backgroundPositionY = `-${deathRow * this.spriteConfig.frameHeight}px`;
        this.element.style.backgroundPositionX = "0px";

        const start = performance.now();

        const animateDeath = (timestamp) => {
            if (this.isDead === false) {
                // Death animation was interrupted
                if (this.deathAnimationFrame) {
                    cancelAnimationFrame(this.deathAnimationFrame);
                    this.deathAnimationFrame = null;
                }
                return;
            }

            const elapsed = timestamp - start;
            const frame = Math.min(Math.floor(elapsed / frameDelay), frameCount - 1);

            if (frame !== currentFrame) {
                currentFrame = frame;
                this.element.style.backgroundPositionX = `-${frame * this.spriteConfig.frameWidth}px`;
            }

            if (currentFrame < frameCount - 1) {
                this.deathAnimationFrame = requestAnimationFrame(animateDeath);
            } else {
                this.element.style.transition = "opacity 0.5s ease-out";
                this.element.style.opacity = "0";
                
                // Store reference to element for cleanup
                const elementToRemove = this.element;
                
                // Clear the element reference immediately
                this.element = null;
                
                setTimeout(() => {
                    if (elementToRemove?.parentNode) {
                        elementToRemove.parentNode.removeChild(elementToRemove);
                    }
                }, 500);
            }
        };

        this.deathAnimationFrame = requestAnimationFrame(animateDeath);
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        if (this.deathAnimationFrame) {
            cancelAnimationFrame(this.deathAnimationFrame);
            this.deathAnimationFrame = null;
        }
        if (this.element?.parentNode) {
            this.element.parentNode.removeChild(this.element);
            this.element = null;
        }
    }

    resetPosition() {
        // First, ensure we cancel any ongoing animations
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        if (this.deathAnimationFrame) {
            cancelAnimationFrame(this.deathAnimationFrame);
            this.deathAnimationFrame = null;
        }

        // Reset all state variables
        this.isMoving = false;
        this.activeKey = null;
        this.currentDirection = null;
        this.frameX = 0;
        this.directionY = 0;
        this.isDead = false;

        // If the element was removed or doesn't exist, create a new one
        if (!this.element) {
            this.place();
            return;
        }

        // If element exists but was made invisible, reset it
        const gridCell = document.querySelector(`[data-x="1"][data-y="1"]`);
        if (!gridCell) return console.error("Character reset point not found!");

        // Reset position
        this.x = 1;
        this.y = 1;

        // Calculate new position
        const offsetX = gridCell.offsetLeft + (CELL_SIZE - this.spriteConfig.frameWidth) / 2;
        const offsetY = gridCell.offsetTop + (CELL_SIZE - this.spriteConfig.frameHeight) / 2;

        // Reset styles without transitions to prevent visual glitches
        this.element.style.transition = "none";
        this.element.style.opacity = "0";
        this.element.style.left = `${offsetX}px`;
        this.element.style.top = `${offsetY}px`;
        this.element.style.backgroundPositionX = "0px";
        this.element.style.backgroundPositionY = "0px";
        this.element.style.zIndex = "10";
        
        // Force browser to apply these changes before starting fade-in
        this.element.offsetHeight; // Trigger reflow
        
        // Now fade in with transition
        this.element.style.transition = "opacity 0.5s ease-in";
        this.element.style.opacity = "1";
        
        // Restart animation loop after a short delay to ensure everything is reset
        setTimeout(() => {
            this.lastFrameTime = performance.now();
            this.animationFrame = requestAnimationFrame((ts) => this.animateSprite(ts));
        }, 50);
    }

}