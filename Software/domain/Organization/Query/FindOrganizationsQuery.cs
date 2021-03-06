﻿
using Kit.Core.CQRS.Query;

namespace domain.Organization.Query
{
    public class FindOrganizationsQuery : IQuery
    {
        /// <summary>
        /// Поиск по сотрудникам/по организациям
        /// </summary>
        public bool EmployeeSearch { get; set; }

        public int? OrganizationId { get; set; }

        public string Filter { get; set; }
    }
}
