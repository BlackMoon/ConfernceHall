﻿using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Kit.Core.CQRS.Query;
using Microsoft.AspNetCore.Mvc;
using domain.Conference;
using domain.Conference.Command;
using domain.Conference.Query;
using Kit.Core.CQRS.Command;
using Microsoft.AspNetCore.JsonPatch;
using TimeRange = domain.Common.Range<System.DateTime>;

namespace host.Controllers
{
    [Route("api/[controller]")]
    public class ConferencesController : CqrsController
    {
        // GET api/conferences
        public ConferencesController(ICommandDispatcher commandDispatcher, IQueryDispatcher queryDispatcher) : base(commandDispatcher, queryDispatcher)
        {
        }

        [HttpGet]
        public Task<IEnumerable<Conference>> Get(ConfState? state, DateTime? startDate, DateTime? endDate)
        {
            FindConferencesQuery query = new FindConferencesQuery() { EndDate = endDate, StartDate = startDate, State = state };
            return QueryDispatcher.DispatchAsync<FindConferencesQuery, IEnumerable<Conference>>(query);
        }

        // GET api/conferences/5
        [HttpGet("{id}")]
        public Task<Conference> Get(int id)
        {
            return QueryDispatcher.DispatchAsync<FindConferenceByIdQuery, Conference>(new FindConferenceByIdQuery() { Id = id });
        }

        [HttpPost("/api/appointment")]
        public Task<TimeRange> MakeAppointment([FromBody]MakeAppointmentCommand value)
        {
            return CommandDispatcher.DispatchAsync<MakeAppointmentCommand, TimeRange>(value);
        }

        [HttpPatch("/api/period/{id}")]
        public Task Patch(int id, [FromBody]JsonPatchDocument<Conference> patch)
        {
            Conference value = new Conference()
            {
                Id = id
            };
            patch.ApplyTo(value, ModelState);

            return CommandDispatcher.DispatchAsync<Conference, bool>(value);
        }

        // POST api/conferences
        [HttpPost]
        public Task<int> Post([FromBody]CreateConferenceCommand value)
        {
            return CommandDispatcher.DispatchAsync<CreateConferenceCommand, int>(value);
        }

        // PUT api/conferences/5
        [HttpPut("{id}")]
        public Task Put(int id, [FromBody]Conference value)
        {
            return CommandDispatcher.DispatchAsync<Conference, bool>(value);
        }

        // DELETE api/conferences/5
        [HttpDelete("{id}")]
        public Task Delete(int id)
        {
            return CommandDispatcher.DispatchAsync<DeleteConferenceCommand, bool>(new DeleteConferenceCommand() { Id = id });
        }
    }
}
