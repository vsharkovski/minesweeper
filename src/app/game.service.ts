import { NumberFormatStyle } from '@angular/common';
import { Injectable } from '@angular/core';
import { Subject, of, endWith } from 'rxjs';
import { Config } from './config';
import { Cell } from './cell';
import { State } from './state';
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
            boardRows: 0,
            boardColumns: 0,
            bombsTotal: 0,
            bombsRemaining: 0,
            elapsedTime: 0,
            board: [],
        };
    }

    getState(): Subject<State> {
        return this.state$;
    }

    start(): void {
        const config: Config = {
            boardRows: 9,
            boardColumns: 9,
            bombsTotal: 10,
        }; // may make dynamic (passed to this function) later
        // Initialize new state
        this.state = {
            boardRows: config.boardRows,
            boardColumns: config.boardColumns,
            bombsTotal: config.bombsTotal,
            bombsRemaining: config.bombsTotal,
            elapsedTime: 0,
            board: this.createBoard(config),
        };
        // Emit updated state
        this.state$.next(this.state);
    }

    click(row: number, column: number, isLeft: boolean): void {
        console.log('GameService processing click', row, column, isLeft);
    }

    /**
     * Create a board for the start of the game according to a config.
     */
    private createBoard(config: Config): Cell[][] {
        // Fill board with empty cells
        const board: Cell[][] = [];
        for (let r = 0; r < config.boardRows; r++) {
            const rowArray: Cell[] = [];
            for (let c = 0; c < config.boardColumns; c++) {
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
        // prettier-ignore
        {
        const posDiff = [[-1, 0], [0, 1], [1, 0], [0, -1]];
        for (let r = 0; r < config.boardRows; r++) {
            for (let c = 0; c < config.boardColumns; c++) {
                if (board[r][c].bomb) continue;
                for (let posDiffIndex = 0; posDiffIndex < posDiff.length; posDiffIndex++) {
                    let [r1, c1] = [r + posDiff[posDiffIndex][0], c + posDiff[posDiffIndex][1]];
                    if (r1 >= 0 && r1 < config.boardRows && c1 >= 0 && c1 < config.boardColumns && board[r1][c1].bomb) {
                        board[r][c].adjacentBombs += 1;
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
        for (let r = 0; r < config.boardRows; r++) {
            for (let c = 0; c < config.boardColumns; c++) {
                pos.push({ r: r, c: c });
            }
        }
        // Shuffle the array
        this.shuffleArray(pos);
        // Return prefix of size bombsTotal
        return pos.slice(0, config.bombsTotal);
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
