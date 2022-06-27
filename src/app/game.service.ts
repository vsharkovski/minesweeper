import { Cell } from './cell';
import { Config } from './config';
import { Injectable } from '@angular/core';
import { Position } from 'src/position';
import { State, Status } from './state';
import {
    BehaviorSubject,
    Subject,
    switchMap,
    Observable,
    timer,
    takeUntil,
} from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class GameService {
    // Whenever we update state, we emit it from stateSource
    // Always emit a copy so any subscribers can't modify it
    private state = this.getPlaceholderState();
    private stateSource = new BehaviorSubject<State>({ ...this.state });

    // A timer that starts when startTimer emits.
    // The timer starts from 0 and increments every 1 second (1000 ms).
    // The timer stops when stopTimer emits.
    private startTimer = new Subject<void>();
    private stopTimer = new Subject<void>();
    private timer$ = this.startTimer.pipe(
        switchMap(() => {
            return timer(0, 1000).pipe(takeUntil(this.stopTimer));
        })
    );

    constructor() {
        // Subscribe to constantly update the current state's elapsedTime
        this.timer$.subscribe((newTime) => (this.state.elapsedTime = newTime));
    }

    /** Get an Observable to the current game state. */
    getState(): Observable<State> {
        // Should I instead make an observable once and return it always?
        // Does it affect anything in a case where there are multiple subscribers?
        return this.stateSource.asObservable();
    }

    /** Get an Observable to the playing timer. */
    getTimer(): Observable<number> {
        return this.timer$;
    }

    /** Start the game by setting up the state, starting the timer, and emitting the state. */
    start(): void {
        // Stop the timer
        this.stopTimer.next();
        // May make the config dynamic (passed to this function) later
        const config: Config = {
            rows: 9,
            columns: 9,
            bombs: 10,
        };
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
        this.stateSource.next({ ...this.state });
        // Start the timer
        this.startTimer.next();
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
            // Emit the updated state
            this.stateSource.next({ ...this.state });
        }
        // If not playing, don't do anything.
    }

    /** Get a placeholder state, where the game hasn't started. */
    private getPlaceholderState(): State {
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

    /** Register the end of the game. */
    private end(victory: boolean): void {
        console.log('GameService ending', victory ? 'won' : 'lost');
        // Stop the timer
        this.stopTimer.next();
        // Update status
        if (victory) {
            this.state.status = Status.Victory;
        } else {
            this.state.status = Status.Loss;
        }
        // Reveal all bomb cells
        for (let r = 0; r < this.state.rows; r++) {
            for (let c = 0; c < this.state.columns; c++) {
                const cell: Cell = this.state.board[r][c];
                if (cell.bomb) {
                    cell.revealed = true;
                }
            }
        }
        // Emit final end state
        this.stateSource.next({ ...this.state });
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
                        r >= 0 && r < state.rows &&
                        c >= 0 && c < state.columns &&
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
                        if (r1 >= 0 && r1 < config.rows
                            && c1 >= 0 && c1 < config.columns
                            && (r1 != r || c1 != c)) {
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
