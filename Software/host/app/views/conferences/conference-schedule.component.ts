﻿import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { Logger } from "../../common/logger";
import { Schedule } from "primeng/components/schedule/schedule";
import { AppointmentDialogComponent } from "./appointment-dialog.component";
import { AppointmentModel, ConferenceModel, ConfState, confDragType, TimeRange } from '../../models';
import { ConfirmationService, MenuItem } from 'primeng/primeng';
import { ConferenceService } from './conference.service';
import { ConferenceListComponent } from "./conference-list.component";

@Component({
    encapsulation: ViewEncapsulation.None,
    styles: [`.p0501 .ui-tabview-panel { padding: 0.5em 0.1em; }`],
    templateUrl: 'conference-schedule.component.html'
})
export class ConferenceScheduleComponent {

    @ViewChild(AppointmentDialogComponent) appointmentDialog: AppointmentDialogComponent;
    @ViewChild(ConferenceListComponent) conferenceList: ConferenceListComponent;

    events: any[];
    headerConfig: any;
    menuItems: MenuItem[];

    endDate: Date;
    startDate: Date;
    
    selectedConference: ConferenceModel;
    selectedEvent: any;

    constructor(
        private conferrenceService: ConferenceService,
        private confirmationService: ConfirmationService,
        private logger: Logger,
        private router: Router) {

        this.headerConfig = {
            left: 'prev,next today',
            center: 'title',
            right: 'month,agendaWeek,agendaDay,listWeek'
        };

        this.menuItems = [
            {
                label: "Изменить",
                icon: "fa-pencil",
                command: () => this.router.navigate(["/conferences", this.selectedEvent.id])
            },
            {
                label: "Удалить",
                icon: "fa-trash",
                command: () => {
                    this.confirmationService.confirm({
                        header: 'Вопрос',
                        icon: 'fa fa-trash',
                        message: `Удалить [${this.selectedEvent.title}]?`,
                        accept: _ => {
                            return this.conferrenceService
                                .changeState(this.selectedEvent.id, ConfState.Planned)
                                .subscribe(
                                    _ => {

                                        if (this.conferenceList.selectedState === ConfState.Planned)
                                        {
                                            let conference: ConferenceModel = 
                                            {
                                                id: this.selectedEvent.id,
                                                subject: this.selectedEvent.title,
                                                description: this.selectedEvent.description,
                                                selected: false,
                                                state: ConfState.Planned
                                            };
                                            this.conferenceList.addConferenceToList(conference);
                                        }

                                        this.removeEventFromList(this.selectedEvent.id);
                                    },
                                    error => this.logger.error(error));
                        }
                    });
                }
            }];
        
    }

    appointmentDialogClosed(appointment: AppointmentModel) {
        
        if (appointment != null) {

            this.conferrenceService
                .makeAppointment(this.selectedConference.id, appointment)
                .subscribe(
                    (period:TimeRange) => {
                       
                        this.events.push(
                            {
                                id: this.selectedConference.id,
                                title: this.selectedConference.subject,
                                description: this.selectedConference.description,
                                start: period.lowerBound,
                                end: period.upperBound
                            });
                        this.conferenceList.removeConferenceFromList(this.selectedConference.id, false);
                        this.selectedConference = null;
                    },
                    error =>
                    {
                        this.selectedConference = null;
                        this.logger.error(error);
                    }
            );
        }
    }

    drop(date, event) {
        debugger;
        //let conference = JSON.parse(event.dataTransfer.getData(confDragType));
    }

    eventDrop(e) {

        this.conferrenceService
            .changePeriod(e.event.id, e.event.start.toDate(), e.event.end.toDate())
            .subscribe(
                _ => {},
                error => {
                    e.revertFunc.call();
                    this.logger.error(error);
                });
        
    }

    eventRender = (event, element) => element.attr("title", event.description || event.title);

    eventResize(e) {
      
        this.conferrenceService
            .changePeriod(e.event.id, e.event.start.toDate(), e.event.end.toDate())
            .subscribe(
                _ => {},
                error => {
                    e.revertFunc.call();
                    this.logger.error(error);
                });
    }

    makeAppointment(conference) {

        // time period like schedule's view period
        let renderedDays:number = (<any>this.endDate - <any>this.startDate) / 864e5,
            calendarVisible = (renderedDays !== 1),
            date = this.startDate.getDate(),
            month = this.startDate.getMonth();

        if (renderedDays >= 28 && this.startDate.getDate() > 20)
        {
            // show next month
            date = 1;
            month++;
        }
        
        this.selectedConference = conference;
        this.appointmentDialog.show(<any>{ hallId: this.selectedConference.hallId, start: new Date(this.startDate.getFullYear(), month, date) }, calendarVisible);    
    }

    removeEventFromList(id) {
        let ix = this.events.findIndex(c => c.id === id);
        this.events.splice(ix, 1); 

        this.selectedEvent = null;
    }

    viewRender(event) {
        this.startDate = event.view.start.toDate();
        this.endDate = event.view.end.toDate();

        this.conferrenceService
            .getAll(this.startDate, this.endDate)
            .subscribe(
                conferences => this.events = conferences.map(c => <any>{ id: c.id, start: c.startDate, end: c.endDate, title: c.subject, description: c.description }),
                error => this.logger.error(error));
    }
}