﻿using System;
using domain.Common.Query;

namespace domain.Screen.Query
{
    public class FindScreensQuery : GetAllQuery
    {
        public DateTime StartDate { get; set; }
    }
}
