﻿import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';

@Component({
    host: { '(window:resize)': "onResize($event)" },
    selector: "detail",
    template: ` <div class="h100p">
                    <div #nav class="ui-widget-header" style="height: 37px; padding: .5em .75em">
                        <ng-content select="nav"></ng-content>
                    </div>
                    <div #main style="overflow:auto">
                        <ng-content select="main"></ng-content>
                    </div>
                </div>`
})
export class DetailComponent implements AfterViewInit {

    @ViewChild('main') mainElRef: ElementRef;
    @ViewChild('nav') navElRef: ElementRef;

    ngAfterViewInit() {
        this.onResize();
    }

    onResize() {
       
        let mainEl = this.mainElRef.nativeElement;
        mainEl.style.height = `${mainEl.parentElement.offsetHeight - this.navElRef.nativeElement.offsetHeight}px`;
    }   
}