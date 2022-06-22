import { NumberFormatStyle } from '@angular/common';
import { Injectable } from '@angular/core';
import { Subject, of, endWith, config } from 'rxjs';
import { Config } from './config';
import { Cell } from './cell';
import { State, Status } from './state';
import { Position } from 'src/position';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    private state!: State;
    private state$!: Subject<State>;

    constructor() {
        this.state = this.getPlaceholderState();
        this.state$ = new Subject<State>(); // We will emit new state from here whenever we finish updating things
        this.state$.next(this.state);
    }

    getPlaceholderState(): State {
        // This whole thing seems wrong. It would feel better if the component subscribed to state$ once
        // and immediately got a default value, but that didn't work.
        return {
            status: Status.NotStarted,
            rows: 0,
            columns: 0,
            bombs: 0,
            flags: 0,
            cellsRevealed: 0,
            elapsedTime: 0,
            board: [],
        };
    }

    /** Get an Observable to the current game state. */
    getState(): Subject<State> {
        return this.state$;
    }

    /** Start the game. */
    start(): void {
        const config: Config = {
            rows: 9,
            columns: 9,
            bombs: 10,
        }; // may make dynamic (passed to this function) later
        // Initialize new state
        this.state = {
            status: Status.Playing,
            rows: config.rows,
            columns: config.columns,
            bombs: config.bombs,
            flags: 0,
            cellsRevealed: 0,
            elapsedTime: 0,
            board: this.createBoard(config),
        };
        // Emit updated state
        this.state$.next({ ...this.state });
    }

    /** Process a left or right click at a certain row and column. */
    click(row: number, column: number, isLeft: boolean): void {
        console.log('GameService processing click', row, column, isLeft);
        // If currently playing
        if (this.state.status == Status.Playing) {
            const cell = this.state.board[row][column]; // should I check that row and column are in range?
            if (cell.revealed) return; // Do nothing if cell was already revealed
            if (isLeft) {
                if (cell.bomb) {
                    // Clicked a bomb, lose the game
                    this.end(false);
                } else {
                    // Non-bomb cell. Reveal area around the click
                    this.revealEmptyArea(this.state, cell);
                    // If revealed everything, win the game.
                    if (
                        this.state.cellsRevealed ==
                        this.state.rows * this.state.columns - this.state.bombs
                    ) {
                        this.end(true);
                    }
                }
            } else {
                // toggle flag for this cell
                if (cell.flag) {
                    cell.flag = false;
                    this.state.flags -= 1;
                } else {
                    cell.flag = true;
                    this.state.flags += 1;
                }
            }
        }
        // Emit the updated state
        this.state$.next({ ...this.state });
    }

    /** Register the end of the game. */
    private end(victory: boolean): void {
        console.log('GameService ending');
        if (victory) {
            this.state.status = Status.Victory;
        } else {
            this.state.status = Status.Loss;
        }
    }

    /**
     * Reveal empty area around a source cell.
     * If the source cell has any adjacent bombs, do not reveal more.
     * Otherwise do the same to adjacent cells in a floodfill-like manner.
     */
    private revealEmptyArea(state: State, source: Cell): void {
        source.revealed = true;
        state.cellsRevealed += 1;
        // do Breadth-First Search to reveal all connected empty
        const queue = [source];
        while (queue.length > 0) {
            const top: Cell = queue.pop()!; // never undefined
            if (top.adjacentBombs > 0) {
                // Do not reveal adjacent cells if current cell has a number
                continue;
            }
            for (let r = top.position.r - 1; r <= top.position.r + 1; ++r) {
                for (let c = top.position.c - 1; c <= top.position.c + 1; ++c) {
                    // prettier-ignore
                    if (
                        r >= 0 && r < this.state.rows &&
                        c >= 0 && c < this.state.columns &&
                        !state.board[r][c].revealed &&
                        !state.board[r][c].bomb
                    ) {
                        state.board[r][c].revealed = true;
                        state.cellsRevealed += 1;
                        queue.push(state.board[r][c]);
                    }
                }
            }
        }
    }

    /**
     * Create a board for the start of the game according to a config.
     */
    private createBoard(config: Config): Cell[][] {
        // Fill board with empty cells
        const board: Cell[][] = [];
        for (let r = 0; r < config.rows; r++) {
            const rowArray: Cell[] = [];
            for (let c = 0; c < config.columns; c++) {
                rowArray.push({
                    position: { r: r, c: c },
                    revealed: false,
                    bomb: false,
                    flag: false,
                    adjacentBombs: 0,
                });
            }
            board.push(rowArray);
        }
        // Place bombs
        this.generateBombPositions(config).forEach((pos: Position) => {
            board[pos.r][pos.c].bomb = true;
        });
        // Calculate bomb adjacency counts
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.columns; c++) {
                if (!board[r][c].bomb) continue;
                // This cell has a bomb.
                // Add to bomb counts of all adjacent cells
                for (let r1 = r - 1; r1 <= r + 1; ++r1) {
                    for (let c1 = c - 1; c1 <= c + 1; ++c1) {
                        // prettier-ignore
                        if (r1 >= 0 && r1 < config.rows && c1 >= 0 && c1 < config.columns) {
                            board[r1][c1].adjacentBombs += 1;
                        }
                    }
                }
            }
        }
        return board;
    }

    /**
     * Generate an array of bomb positions according to a config.
     */
    private generateBombPositions(config: Config): Position[] {
        // Create an array of all possible positions
        const pos: Position[] = [];
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.columns; c++) {
                pos.push({ r: r, c: c });
            }
        }
        // Shuffle the array
        this.shuffleArray(pos);
        // Return prefix of size bombsTotal
        return pos.slice(0, config.bombs);
    }

    /**
     * Shuffle an array in-place.
     * Algorithm borrowed from: https://stackoverflow.com/a/12646864
     */
    private shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}