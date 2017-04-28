﻿using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using domain.Element;
using domain.Element.Command;
using domain.Element.Query;
using Kit.Core.CQRS.Command;
using Kit.Core.CQRS.Query;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.JsonPatch;
using Microsoft.AspNetCore.Mvc;

namespace host.Controllers
{
    [Route("api/[controller]")]
    public class ElementsController : CqrsController
    {
        public ElementsController(ICommandDispatcher commandDispatcher, IQueryDispatcher queryDispatcher) : base(commandDispatcher, queryDispatcher)
        {
        }

        [HttpGet]
        public Task<IEnumerable<Element>> Get(int? groupId, string filter)
        {
            // todo userId from HttpContext.User
            FindElementsQuery query = new FindElementsQuery()
            {
                Filter = filter,
                GroupId = groupId,
                UserId = 1
            };
            return QueryDispatcher.DispatchAsync<FindElementsQuery, IEnumerable<Element>>(query);
        }

        [HttpGet("/api/thumbnail/{id}")]
        public async Task<ActionResult> GetThumbnail(int id)
        {
            byte[] fileContents = {};
            string contentType = "image/*";

            Element el = await QueryDispatcher.DispatchAsync<FindElementByIdQuery, Element>(new FindElementByIdQuery() { Id = id });
            if (el != null)
            {
                fileContents = el.Data;
                contentType = el.MimeType;
            }

            return new FileContentResult(fileContents, contentType);
        }

        /// <summary>
        /// Отправляются файлы ('Content-Type', 'multipart/form-data')
        /// </summary>
        [HttpPost]
        public async Task Post(CreateElementCommand value)
        {
            IFormFile f = Request.Form.Files.FirstOrDefault();
            if (f != null)
            {
                using (MemoryStream ms = new MemoryStream())
                {
                    await f.CopyToAsync(ms);
                    value.Data = ms.ToArray();
                }
                value.ContentType = f.ContentType;
            }
            
            await CommandDispatcher.DispatchAsync<CreateElementCommand, long>(value);
        }

        [HttpPatch("/api/favorite/{id}")]
        public Task Patch(int id, [FromBody]JsonPatchDocument<AddToFavoritesCommand> patch)
        {
            AddToFavoritesCommand command = new AddToFavoritesCommand
            {
                ElementId = id,
                UserId = 1  // todo from HttpContext.User
            };
            patch.ApplyTo(command, ModelState);
            
            return CommandDispatcher.DispatchAsync(command);
        }
        
        [HttpDelete("{id}")]
        public void Delete(int id)
        {
        }
    }
}
