﻿using System;
using System.Collections.Generic;
using System.Text;
using domain.Common.Query;

namespace domain.Scheme.Query
{
    public class FindSchemasQuery : GetAllQuery
    {
        public string Filter { get; set; }

        public int? HallId { get; set; }
    }
}