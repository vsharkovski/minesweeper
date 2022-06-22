import { Component, OnInit } from '@angular/core';
import { Cell } from '../cell';
import { GameService } from '../game.service';
import { State } from '../state';
import { Status } from '../state';

@Component({
    selector: 'app-game',
    templateUrl: './game.component.html',
    styleUrls: ['./game.component.css'],
})
export class GameComponent implements OnInit {
    state!: State;
    cells: Cell[] = [];
    statusString = '';
    time = 0;
    debugging = false;

    constructor(private gameService: GameService) {}

    ngOnInit(): void {
        this.getState();
        this.getTimer();
    }

    getState(): void {
        this.processState(this.gameService.getPlaceholderState());
        this.gameService
            .getState()
            .subscribe((newState) => this.processState(newState));
    }

    getTimer(): void {
        this.gameService
            .getTimer()
            .subscribe((newTime) => (this.time = newTime));
    }

    processState(state: State): void {
        console.log('GameComponent processing state', state);
        this.state = state; // {...state}
        this.cells = state.board.flat();
        this.statusString = Status[state.status]; // convert enum value to its key
    }

    start(): void {
        this.gameService.start();
    }

    getCellSymbol(cell: Cell): string {
        if (cell.revealed || this.debugging) {
            if (cell.bomb) {
                return 'X';
            } else if (cell.adjacentBombs == 0) {
                return '';
            } else {
                return cell.adjacentBombs.toString();
            }
        } else {
            if (cell.flag) {
                return 'F';
            } else {
                return '';
            }
        }
    }

    getCellImage(cell: Cell): string {
        if (cell.bomb && (cell.revealed || this.debugging)) {
            return './assets/bomb-64.png';
        } else if (cell.flag && !cell.revealed) {
            return './assets/flag-64.png';
        }
        return '';
    }

    getColor(cell: Cell): string {
        // prettier-ignore
        switch (cell.adjacentBombs) {
            case 1: return '#0000FF';
            case 2: return '#05a100';
            case 3: return '#d60000';
            case 4: return '#e342f5';
            case 5: return '#ffa600';
            case 6: return '#009fad';
            case 7: return '#c46c00';
            case 8: return '#8400d1';
        }
        return '#000';
    }

    onLeftClick(cell: Cell): void {
        this.gameService.click(cell.position.r, cell.position.c, true);
    }

    onRightClick(cell: Cell): void {
        this.gameService.click(cell.position.r, cell.position.c, false);
    }

    toggleDebug(): void {
        this.debugging = !this.debugging;
        console.log('Debugging now:', this.debugging);
    }
}
