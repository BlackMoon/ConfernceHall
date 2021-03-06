﻿using Dapper;
using domain.Common.Query;
using Kit.Core.CQRS.Query;
using Kit.Dal.DbManager;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;

namespace domain.Conference.Query
{
    public class ConferenceQueryHandler : 
        KeyObjectQueryHandler<FindConferenceByIdQuery, Conference>,
        IQueryHandler<FindConferencesQuery, IEnumerable<Conference>>
    {
        public ConferenceQueryHandler(IDbManager dbManager) : base(dbManager)
        {
        }

        public IEnumerable<Conference> Execute(FindConferencesQuery query)
        {
            throw new System.NotImplementedException();
        }

        public  override async Task<Conference> ExecuteAsync(FindConferenceByIdQuery query)
        {
            SqlBuilder sqlBuilder = new SqlBuilder("conf_hall.conferences c")
                .Column("c.id")
                .Column("c.subject")
                .Column("c.description")
                .Column("c.state")
                .Column("c.hall_id hallId")
                .Column("c.hall_scheme_id schemeId")
                .Column("lower(c.period) startDate")
                .Column("upper(c.period) endDate")
                .Where("id = @id")
                .OrderBy("lower(c.subject)");
            
            await DbManager.OpenAsync();
            return await DbManager.DbConnection.QuerySingleOrDefaultAsync<Conference>(sqlBuilder.ToString(), new { id = query.Id });
        }

        public async Task<IEnumerable<Conference>> ExecuteAsync(FindConferencesQuery query)
        {
            SqlBuilder sqlBuilder = new SqlBuilder("conf_hall.conferences c")
               .Column("c.id")
               .Column("c.subject")
               .Column("c.description")
               .Column("c.hall_id hallId")
               .Column("lower(c.period) startDate")
               .Column("upper(c.period) endDate")
               .OrderBy("lower(c.subject)");

            DynamicParameters param = new DynamicParameters();

            if (query.State.HasValue)
            {
                sqlBuilder.Where("c.state = @state::conf_state");
                // pgSql::conf_state --> lowerCase
                param.Add("state", query.State.ToString().ToLower());
            }
            else
                sqlBuilder.Where("c.state != 'planned'::conf_state");

            // [активные, на подготовке, завершенные] совещания фильтруются по дате
            if (query.State != ConfState.Planned)
            {
                sqlBuilder.Where("c.period && tsrange(@startDate, @endDate, '[]')");
                
                param.Add("startDate", query.StartDate, DbType.Date);
                param.Add("endDate", query.EndDate, DbType.Date);
            }

            // фильтр по холлам
            if (query.HallIds != null)
            {
                sqlBuilder.Where("c.hall_id = ANY(@hallIds)");
                param.Add("hallIds", query.HallIds);
            }

            string expr = string.Empty; 

            // фильтр по сотрудникам
            if (query.EmployeeIds != null)
            {
                expr = "c.id in (SELECT m.conf_id FROM conf_hall.conf_members m WHERE m.employee_id = ANY(@employeeIds))";
                param.Add("employeeIds", query.EmployeeIds);
            }

            // фильтр по организациям
            if (query.OrganizationIds != null)
            {
                if (query.EmployeeIds != null)
                    expr += " OR ";

                expr += "c.id in (SELECT m.conf_id FROM conf_hall.conf_members m JOIN conf_hall.employees e ON e.id = m.employee_id WHERE e.org_id = ANY(@orgIds))";
                param.Add("orgIds", query.OrganizationIds);
            }

            if (!string.IsNullOrEmpty(expr))
                sqlBuilder.Where(expr);

            await DbManager.OpenAsync();
            return await DbManager.DbConnection.QueryAsync<Conference>(sqlBuilder.ToString(), param);
        }
    }
}
