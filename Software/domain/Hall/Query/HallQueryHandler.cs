﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using domain.Common.Query;
using Dapper;
using Kit.Dal.DbManager;

namespace domain.Hall.Query
{
    public class HallQueryHandler: KeyObjectQueryHandler<FindHallByIdQuery, Hall>
    {
        private const string SelectHall = "SELECT h.*, s.* FROM conf_hall.halls h LEFT JOIN conf_hall.hall_scheme s ON s.hall_id = h.id";

        public HallQueryHandler(IDbManager dbManager) : base(dbManager)
        {
        }

        public override async Task<Hall> ExecuteAsync(FindHallByIdQuery query)
        {
            IDbManagerAsync dbManagerAsync = DbManager as IDbManagerAsync;
            if (dbManagerAsync != null)
            {
                await dbManagerAsync.OpenAsync();

                Hall prev = null;
                Func<Hall, Scheme, Hall> map = (h, s) =>
                {
                    if (prev != null && prev.Id != h.Id)
                    {
                        prev.Schemes.Add(s);
                        return null;
                    }

                    prev = h;
                    prev.Schemes = new List<Scheme> {s};

                    return h;
                };

                var halls = await DbManager.DbConnection.QueryAsync($"{SelectHall} WHERE h.id = @id", map, new { id = query.Id});

                return halls.SingleOrDefault();
            }

            throw new NotImplementedException();
        }
    }
}
