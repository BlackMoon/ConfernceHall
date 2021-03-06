﻿import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import {
    AccordionModule,
    ButtonModule,
    DataGridModule,
    DataListModule,
    DataTableModule,
    FieldsetModule,
    InputTextModule,
    InputTextareaModule,
    PanelModule,
    SpinnerModule,
    ToggleButtonModule,
    ToolbarModule
} from 'primeng/primeng';

import { UiModule } from '../../common/ui/ui.module';
import { HallDetailComponent } from './hall-detail.component';
import { HallTableComponent } from './hall-table.component';
import { HallRoutingModule } from './halls-routing.module';
import { HallService } from './hall.service';
import { SchemesModule } from "../schemes/schemes.module";

@NgModule({
    declarations: [HallDetailComponent, HallTableComponent],
    exports: [ButtonModule, DataGridModule, FieldsetModule, InputTextModule, InputTextareaModule, SpinnerModule, HallTableComponent],
    imports: [
        AccordionModule,
        ButtonModule,
        CommonModule,
        DataGridModule,
        DataListModule,
        DataTableModule,
        FieldsetModule,
        FormsModule,
        HallRoutingModule,
        InputTextModule,
        InputTextareaModule,
        PanelModule,
        ReactiveFormsModule,
        SchemesModule, 
        SpinnerModule,
        ToggleButtonModule,
        ToolbarModule,
        UiModule],
    providers: [HallService]
})
export class HallsModule { }
