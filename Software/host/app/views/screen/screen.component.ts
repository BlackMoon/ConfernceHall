﻿import { AfterViewInit, Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Logger } from "../../common/logger";
import { borderClass, markClass } from "../../common/svg-utils";
import { MemberModel, MemberState, ScreenModel } from '../../models';
import { SchemeMainComponent } from "../schemes/scheme-main.component";
import { HubService } from "../../common/hub-service";
import { ScreenService } from "./screen.service";
import { MemberTableComponent } from "../members/member-table.component";

const tickInterval = 5000;

@Component({
    encapsulation: ViewEncapsulation.None,
    host: { '(window:resize)': "onResize($event)" },
    styles: [".h40 { height: 40px }"],
    templateUrl: 'screen.component.html'
})
export class ScreenComponent implements AfterViewInit, OnInit {

    canvas: any;
    canvasBox: any;

    now: Date = new Date();
    endDate: Date;
    startDate: Date;
    subject: string;

    hubObservable: Observable<any>;

// ReSharper disable once InconsistentNaming
    private _tickers: string[] = [];

    get tickers(): string[] {
        return this._tickers;
    }

    set tickers(tickers: string[]) {
        
        this.ticker = (tickers.length > 0) ? tickers[0] : "";
        this._tickers = tickers;
    }

    /**
     * id конференции
     */
    id: number;
    
    activeScreen: ScreenModel;

    /**
     * (Бегущая) строка
     */
    ticker: string;

    @ViewChild('box') boxElRef: ElementRef;

    @ViewChild('header') headerElRef: ElementRef;

    @ViewChild('footer') footerElRef: ElementRef;

    @ViewChild('wrapper') wrapperElRef: ElementRef;

    @ViewChild(MemberTableComponent) memberTable: MemberTableComponent;

    @ViewChild(SchemeMainComponent) schemeMain: SchemeMainComponent;

    constructor(
        private logger: Logger,
        private route: ActivatedRoute,
        private hubService: HubService,
        private screenService: ScreenService) {
    }

    ngAfterViewInit() {
       
    }

    ngOnInit() {
        
        this.route.params

            .switchMap((params: Params) => {
                // (+) converts string 'id' to a number
                this.id = params.hasOwnProperty("id") ? +params["id"] : undefined;

                if (this.id) {
                    // служба signalR может отсутствовать
                    this.hubService
                        .start(this.id)
                        .subscribe(_ => {

                            this.hubService
                                .confirmMember
                                .subscribe(member => {
                                    
                                    this.schemeMain.toggleMark(member.oldSeat, false);
                                    this.schemeMain.toggleMark(member.seat, true);
                                    this.memberTable.confirmMember(member);
                                });

                            this.hubService
                                .deleteMember
                                .subscribe(id => {

                                    let member = this.memberTable.getMember(id);
                                    if (member) {
                                        this.schemeMain.toggleMark(member.seat, false);   
                                        this.memberTable.removeMember(member.id);
                                    }
                                });

                            this.hubService
                                .sendTickers
                                .subscribe(tickers => this.tickers = tickers);
                        });

                    return this.screenService.get(this.id);
                }

                return Observable.empty();
            })
            .subscribe((screen: ScreenModel) =>
                {
                    this.activeScreen = screen;
                    this.tickers = this.activeScreen.tickers || [];
                },
                error => this.logger.error2(error));

        Observable
            .combineLatest(this.schemeMain.schemeLoaded, this.memberTable.membersLoaded)
            .subscribe((a: Array<any>) => {
                // занятые места
                let members: MemberModel[] = a[1] || [];
                [].forEach.call(members, m => (m.state === MemberState.Confirmed) && this.schemeMain.toggleMark(m.seat));
            });

        // clock
        setInterval(() => this.now = new Date(), 1000);

        // ticker
        setInterval(() => {
            let ix = this.tickers.indexOf(this.ticker) + 1;
            if (ix > this.tickers.length - 1) {
                ix = 0;
            }

            this.ticker = this.tickers[ix];

        }, tickInterval);

        this.onResize();
    }
    
    onResize() {
        this.boxElRef.nativeElement.style.height = `${this.wrapperElRef.nativeElement.offsetHeight - this.headerElRef.nativeElement.offsetHeight - this.footerElRef.nativeElement.offsetHeight}px`;
    }
}