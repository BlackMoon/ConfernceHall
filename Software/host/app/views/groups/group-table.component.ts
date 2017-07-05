﻿import { Component, OnInit } from '@angular/core';
import { Logger } from "../../common/logger";
import { Mediator } from "../../common/mediator";
import { GroupModel } from '../../models';
import { GroupService } from './group.service';

@Component({
    selector: 'group-table',
    templateUrl: 'group-table.component.html'
})
export class GroupTableComponent implements OnInit {

    groups: GroupModel[];

    constructor(
        private groupService: GroupService,
        private logger: Logger,
        private mediator: Mediator) { }

    ngOnInit() {

        this.groupService
            .getAll()
            .subscribe(
                groups => this.groups = groups,
                error => this.logger.error2(error));
    }

    itemClick = (group: GroupModel) => this.mediator.broadcast("groupList_itemClicked", group);
}