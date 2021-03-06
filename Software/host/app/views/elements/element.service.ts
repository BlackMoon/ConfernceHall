﻿import { Injectable, isDevMode } from '@angular/core';
import { Http, Headers, RequestOptions, Response, URLSearchParams } from '@angular/http';
import { Observable } from 'rxjs';
import { handleResponseError } from '../../common/http-error';
import { HttpDataService } from '../../common/http-data.service';
import { ElementGroupCommand, ElementModel } from '../../models';

import MapUtils from '../../common/map-utils';

@Injectable()
export class ElementService extends HttpDataService<ElementModel> {

    url: string = isDevMode() ? "http://localhost:64346/api/elements" : "api/elements";

    constructor(http: Http) { super(http);  }

    add(element): Observable<any> {

        let formData: FormData = new FormData();
        formData.append("name", element.name);
        formData.append("data", element.image, element.image.name);
        formData.append("height", element.height);
        formData.append("width", element.width);

        return this.http
            .post(this.url, formData)
            .catch(handleResponseError);
    }

    /**
     * Добавить/убрать из избранного
     */
    addToFavorites(c: ElementGroupCommand): Observable<any> {

        return this.http
            .post(`${this.url}/favorites`, c)
            .catch(handleResponseError);
    }

    /**
     * Удалить элементы из группы
     * @param c
     */
    delete(c: ElementGroupCommand): Observable<any> {
        
        // clone ids
        let ids = c.ids.slice(0);

        return this.http
            .post(`${this.url}/delete`, c)
            .map(_ => ids)
            .catch(handleResponseError);
    }

    getAll(filter?: string, groupid?:number): Observable<any> {

        let params: URLSearchParams = new URLSearchParams();

        filter && params.append("filter", filter);
        groupid && params.append("groupid", groupid.toString());
        
        return this.http
            .get(this.url, { params: params })
            .map((r: Response) => r
                .json()
                .map(el => MapUtils.deserialize(ElementModel, el))
            )
            .catch(handleResponseError);
    }

    update(element): Observable<any> {

        let formData: FormData = new FormData();
        formData.append("name", element.name);
        formData.append("height", element.height);
        formData.append("width", element.width);

        element.image && formData.append("data", element.image, element.image.name);

        return this.http
            .put(`${this.url}/${element.id}`, formData)
            .catch(handleResponseError);
    }
}