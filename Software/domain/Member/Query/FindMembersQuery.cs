﻿using domain.Common.Query;

namespace domain.Member.Query
{
    public class FindEmployeesQuery : GetAllQuery
    {
        public int? ConferenceId { get; set; }

        public string Filter { get; set; }

        public int[] OrganizationIds { get; set; }
    }
}
