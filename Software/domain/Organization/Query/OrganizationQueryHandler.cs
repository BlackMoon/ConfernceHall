﻿using Dapper;
using domain.Common.Query;
using Kit.Core.CQRS.Query;
using Kit.Dal.DbManager;
using Mapster;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace domain.Organization.Query
{
    public class OrganizationQueryHandler: 
        KeyObjectQueryHandler<FindOrganizationByIdQuery, Organization>,
        IQueryHandler<FindOrganizationsQuery, IEnumerable<OrganizationNode>>,
        IQueryHandler<FindOrganizationLogoQuery, byte[]>
    {
        public OrganizationQueryHandler(IDbManager dbManager) : base(dbManager)
        {
        }

        public IEnumerable<OrganizationNode> Execute(FindOrganizationsQuery query)
        {
            throw new NotImplementedException();
        }

        public async Task<IEnumerable<OrganizationNode>> ExecuteAsync(FindOrganizationsQuery query)
        {
            SqlBuilder sqlBuilder = new SqlBuilder();

            await DbManager.OpenAsync();

            DynamicParameters param = new DynamicParameters();
            if (query.OrganizationId.HasValue)
            {
                sqlBuilder
                    .Column("e.id")                    
                    .Column("e.name")
                    .Column("e.position")
                    .Column("u.id")
                    .Column("u.locked")
                    .From("conf_hall.employees e")
                    .LeftJoin("conf_hall.users u ON u.employee_id = e.id")
                    .Where("e.org_id = @orgid")
                    .OrderBy("lower(e.name)");

                param.Add("orgid", query.OrganizationId);

                // может задаваться фильтр
                if (query.EmployeeSearch && !string.IsNullOrEmpty(query.Filter))
                {
                    sqlBuilder.Where("lower(e.name) LIKE lower(@filter)");
                    param.Add("filter", query.Filter + "%");
                }

                Func<Employee.Employee, SysUser.SysUser, Employee.Employee> map = (e, u) => { e.User = u; return e; };                

                var employees = await DbManager.DbConnection.QueryAsync(sqlBuilder.ToString(), map, param);

                return employees.Select(e =>
                {
                    OrgEmployeeDto dto = new OrgEmployeeDto();
                    return new OrganizationNode() { Data = e.Adapt(dto), Leaf = true };
                });
            }
            
            sqlBuilder
                .Column("o.id")
                .Column("o.code")
                .Column("o.name")
                .From("conf_hall.organizations o")
                .OrderBy("lower(o.code)");

            // может задаваться фильтр
            if (!string.IsNullOrEmpty(query.Filter))
            {
                string expr;

                if (query.EmployeeSearch)
                {
                    expr = "exists (SELECT e.org_id FROM conf_hall.employees e WHERE e.org_id = o.id AND lower(e.name) LIKE lower(@filter))";
                    param.Add("filter", query.Filter + "%");
                }
                else
                {
                    expr = "lower(o.code) LIKE lower(@filter) OR lower(o.name) LIKE lower(@filter)";
                    param.Add("filter", $"%{query.Filter}%");
                }

                sqlBuilder.Where(expr);
            }

            var orgs = await DbManager.DbConnection.QueryAsync<Organization>(sqlBuilder.ToString(), param);
            return orgs.Select(o =>
            {
                OrgEmployeeDto dto = new OrgEmployeeDto();
                return new OrganizationNode() { Data = o.Adapt(dto) };
            });
            
        }

        public byte[] Execute(FindOrganizationLogoQuery query)
        {
            throw new NotImplementedException();
        }

        public async Task<byte[]> ExecuteAsync(FindOrganizationLogoQuery query)
        {
            SqlBuilder sqlBuilder = new SqlBuilder("conf_hall.organizations o")
                .Column(query.Icon ? "o.icon" : "o.logo")
                .Where("o.id = @id");

            await DbManager.OpenAsync();
            return DbManager.DbConnection.QuerySingleOrDefault<byte[]>(sqlBuilder.ToString(), new { id = query.Id });
        }
    }
}
