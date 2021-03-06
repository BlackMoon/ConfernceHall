﻿import { DatePipe } from '@angular/common';
import { AfterViewInit, Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { Logger } from "../../common/logger";
import { Schedule } from "primeng/components/schedule/schedule";
import { TabView } from "primeng/components/tabview/tabview";
import { AppointmentDialogComponent } from "./appointment-dialog.component";
import { AppointmentModel, ConferenceModel, ConfState, GroupCommand, NodeGroupCommand, TimeRange } from '../../models';
import { ConfirmationService, MenuItem } from 'primeng/primeng';
import { ConferenceService } from './conference.service';
import { ConferenceTableComponent } from "./conference-table.component";

declare var $: any;

@Component({
    encapsulation: ViewEncapsulation.None,
    host: { '(window:resize)': "onResize($event)" },
    styles: [".fc-list-item-marker { width: 38px }", ".p0501 .ui-tabview-panel { box-sizing: content-box; padding: 0.5em 0.1em !important; }"],
    templateUrl: 'conference-schedule.component.html'
})
export class ConferenceScheduleComponent implements AfterViewInit {
    
    @ViewChild(AppointmentDialogComponent) appointmentDialog: AppointmentDialogComponent;
    @ViewChild(ConferenceTableComponent) conferenceTable: ConferenceTableComponent;
    @ViewChild(TabView) tabView: TabView;

    events: any[];
    headerConfig: any;
    menuItems: MenuItem[];

    endDate: Date;
    startDate: Date;
    
    selectedConference: ConferenceModel;
    selectedHallIds: number[];
    selectedEmployeeIds: number[];
    selectedOrganizationIds: number[];
    selectedEvent: any;

    constructor(
        private conferrenceService: ConferenceService,
        private confirmationService: ConfirmationService,
        private datePipe: DatePipe,
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
                command: () => this.removeEventFromSchedule(this.selectedEvent)
            }];
        
    }

    ngAfterViewInit() {
        this.onResize();
    }

    appointmentDialogClosed(appointment: AppointmentModel) {
        
        if (appointment != null) {

            appointment.conferenceId = this.selectedConference.id;

            this.conferrenceService
                .makeAppointment(appointment)
                .subscribe(
                    (period:TimeRange) => {
                       
                        this.events.push(
                            {
                                id: this.selectedConference.id,
                                hallId: this.selectedConference.hallId,
                                title: this.selectedConference.subject,
                                description: this.selectedConference.description,
                                start: period.lowerBound,
                                end: period.upperBound
                            });
                        this.conferenceTable.removeConferenceFromList(this.selectedConference.id, false);
                        this.selectedConference = null;
                    },
                    error =>
                    {
                        this.selectedConference = null;
                        this.logger.error2(error);
                    }
            );
        }
    }
    
    drop(e, element) {
      
        let mouseX = e.pageX,
            mouseY = e.pageY;
        
        let day;
        let days = $("#calendar .fc-day");
        for (let i = 0; i < days.length; i++) {

            let $day = $(days[i]);

            let offset = $day.offset(),
                width = $day.width(),
                height = $day.height();

            if (mouseX >= offset.left && mouseX <= offset.left + width && mouseY >= offset.top && mouseY <= offset.top + height) {
                day = $day;
                break;
            }
        }
       
        // drop именно внутри календаря
        if (day) {
            let data = day.data("date");
            
            if (data) {
                // ie supports only text data format
                let dragData = e.dataTransfer.getData("text"),
                    conference: ConferenceModel = JSON.parse(dragData);
                
                this.makeAppointment(conference, new Date(data));
            }
        }
    }

    eventDragStop(e) {

        let mouseX = e.jsEvent.pageX,
            mouseY = e.jsEvent.pageY;

        let $schedule = $("#calendar"),
            offset = $schedule.offset(),
            width = $schedule.width(),
            height = $schedule.height();

        if (mouseX < offset.left || mouseX > offset.left + width || mouseY < offset.top || mouseY > offset.top + height) {
            this.removeEventFromSchedule(e.event);
        }
    }

    eventDrop(e) {

        this.conferrenceService
            .changePeriod(e.event.id, e.event.start.toDate(), e.event.end.toDate())
            .subscribe(
                _ => {},
                error => {
                    e.revertFunc.call();
                    this.logger.error2(error);
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
                    this.logger.error2(error);
                });
    }

    employeeTreeChanged(c: NodeGroupCommand) {
        
        this.selectedEmployeeIds = c.employeeIds;
        this.selectedOrganizationIds = c.organizationIds;
        this.loadEvents();
    }

    hallTableChanged(c: GroupCommand) {
        this.selectedHallIds = c.ids;
       
        this.loadEvents();
    }

    loadEvents() {

        this.conferrenceService
            .getAll(this.startDate, this.endDate, null, this.selectedHallIds, this.selectedEmployeeIds, this.selectedOrganizationIds)
            .subscribe(
                conferences => this.events = conferences.map(c => <any>{ id: c.id, hallId: c.hallId, start: c.startDate, end: c.endDate, title: c.subject, description: c.description }),
                error => this.logger.error2(error));
    }

    /**
     * Из conference-list'a передается целиком объект [conference] для вставки subject/description в event schedule
     * @param conference
     * @param defaultDate
     */
    makeAppointment(conference, defaultDate: Date = null) {
        
        // time period like schedule's view period
        let startDate = defaultDate || this.startDate,
            endDate = defaultDate || this.endDate,
            renderedDays:number = (<any>endDate - <any>startDate) / 864e5,
            calendarVisible = (renderedDays > 1),
            date = startDate.getDate(),
            month = startDate.getMonth();

        if (renderedDays >= 28 && this.startDate.getDate() > 20)
        {
            // show next month
            date = 1;
            month++;
        }
        
        this.selectedConference = conference;

        if (defaultDate != null)
            this.appointmentDialog.header = `Назначить на ${this.datePipe.transform(defaultDate, "dd.MM.yyyy")}`;

        this.appointmentDialog.show(<any>{ hallId: this.selectedConference.hallId, start: new Date(this.startDate.getFullYear(), month, date) }, calendarVisible);    
    }

    onResize() {
       
        let tabview = this.tabView.el.nativeElement.querySelector("div.ui-tabview"),
            nav = tabview.querySelector("ul.ui-tabview-nav"),
            panels = tabview.querySelectorAll("div.ui-tabview-panel");

        for (let ix = 0; ix < panels.length; ix++) {

            let panel = panels[ix],
                cs = getComputedStyle(panel);
            
            panel.style.height = `${tabview.offsetHeight - nav.offsetHeight - parseFloat(cs.paddingBottom)}px`;
        }
    }

    removeEventFromSchedule(event) {

        this.confirmationService.confirm({
            header: "Вопрос",
            icon: "fa fa-trash",
            message: `Удалить [${event.title}]?`,
            accept: _ => {

                return this.conferrenceService
                    .changeState(event.id, ConfState.Planned)
                    .subscribe(
                    _ => {

                        if (this.conferenceTable.selectedState === ConfState.Planned) {

                            let conference: ConferenceModel =
                                {
                                    id: event.id,
                                    hallId: event.hallId,
                                    subject: event.title,
                                    description: event.description,
                                    state: ConfState.Planned
                                };
                            this.conferenceTable.addConferenceToList(conference);
                        }

                        this.removeEventFromList(event.id);
                    },
                    error => this.logger.error2(error));
            }
        });    
    }

    /**
     * Удалить событие
     * @param id
     */
    removeEventFromList(id) {

        let ix = this.events.findIndex(c => c.id === id);
        (ix !== -1) && this.events.splice(ix, 1);

        this.selectedEvent = null;
    }

    viewRender(event) {
        this.startDate = event.view.start.toDate();
        this.endDate = event.view.end.toDate();

        this.loadEvents();
    }
}